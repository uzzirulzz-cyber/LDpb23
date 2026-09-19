import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Fallbacks so build-time prerendering never crashes with new URL('').
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "playbeat-dev-secret-not-for-production";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/account" },
  providers: [
    // Google Identity Services — server-side ID-token verification happens in the jwt callback.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    // Facebook OAuth — server-side token verification via NextAuth.
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [FacebookProvider({ clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET })]
      : []),
    // Credentials — server-side password hash verification.
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Server-side: link or create a User record for OAuth providers.
      if (account?.provider && account.provider !== "credentials" && user.email) {
        const existing = await db.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (!existing) {
          await db.user.create({
            data: {
              email: user.email.toLowerCase(),
              name: user.name ?? user.email,
              image: user.image,
              role: "customer",
              provider: account.provider,
              providerId: account.providerAccountId,
              emailVerified: new Date(),
            },
          });
        } else if (!existing.providerId) {
          await db.user.update({
            where: { id: existing.id },
            data: { provider: account.provider, providerId: account.providerAccountId, image: user.image ?? existing.image },
          });
        } else if (existing.providerId !== account.providerAccountId) {
          // Duplicate-account protection: email already linked to a different provider identity.
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "customer";
      }
      if (account?.provider) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

export type AppSession = {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: string };
};
