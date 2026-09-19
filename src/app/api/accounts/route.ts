import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const where: Record<string, unknown> = {};
  if (search) where.OR = [{ name: { contains: search } }, { website: { contains: search } }, { industry: { contains: search } }];
  const accounts = await db.account.findMany({ where, include: { contacts: true, _count: { select: { contacts: true, quotes: true, invoices: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: accounts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), contacts: a.contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const account = await db.account.create({
    data: { name: b.name, website: b.website ?? null, industry: b.industry ?? null, country: b.country ?? null,
      currency: b.currency ?? "USD", size: b.size ?? null, ownerRepId: b.ownerRepId ?? null },
  });
  return NextResponse.json({ data: { ...account, createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString() } });
}
