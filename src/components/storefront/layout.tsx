"use client";

import type { ReactNode } from "react";
import { StorefrontHeader } from "./header";
import { StorefrontFooter } from "./footer";

/**
 * StorefrontLayout — wraps storefront pages in a permanent dark navy canvas
 * with the izoko gold/silver aesthetic. NO ThemeProvider, NO next-themes — the
 * storefront is always dark navy (#050814). The root layout already mounts
 * <SessionProvider> via <Providers>, so auth works without re-mounting.
 */
export function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#050814] text-slate-200 storefront-scroll">
      {/* Ambient aurora background — fixed, low opacity */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, rgba(56, 189, 248, 0.10) 0%, transparent 60%)," +
            "radial-gradient(50% 40% at 80% 0%, rgba(250, 204, 21, 0.08) 0%, transparent 60%)," +
            "radial-gradient(80% 60% at 50% 100%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
        }}
      />
      <StorefrontHeader />
      <main className="relative z-0">{children}</main>
      <StorefrontFooter />
    </div>
  );
}
