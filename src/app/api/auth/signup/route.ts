import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// POST /api/auth/signup
// Customer self-signup. Creates a User (role=customer) + linked Customer record.
// Does NOT auto-login — frontend redirects to /account (signin) after success.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;

    // ── Validate input ──
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // ── Check existing user ──
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // ── Hash password ──
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create User + Customer (linked) in a transaction ──
    const user = await db.user.create({
      data: {
        email,
        name,
        role: "customer",
        provider: "credentials",
        passwordHash,
        emailVerified: new Date(),
        customers: {
          create: {
            email,
            name,
            phone,
          },
        },
      },
      include: { customers: true },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actor: "customer",
        actorId: user.id,
        action: "signup",
        entity: "user",
        entityId: user.id,
        meta: JSON.stringify({ email, hasPhone: Boolean(phone) }),
      },
    });

    // Analytics event
    await db.analyticsEvent.create({
      data: {
        type: "signup",
        entity: "user",
        entityId: user.id,
        source: "storefront",
        meta: JSON.stringify({ email }),
      },
    });

    return NextResponse.json({
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        redirectTo: "/account?signedup=1",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/signup] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
