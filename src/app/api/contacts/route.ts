import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const accountId = searchParams.get("accountId");
  const where: Record<string, unknown> = {};
  if (accountId && accountId !== "all") where.accountId = accountId;
  if (search) where.OR = [{ firstName: { contains: search } }, { lastName: { contains: search } }, { email: { contains: search } }];
  const contacts = await db.contact.findMany({ where, include: { account: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.firstName || !b.email) return NextResponse.json({ error: "firstName, email required" }, { status: 400 });
  const contact = await db.contact.create({
    data: { accountId: b.accountId ?? null, firstName: b.firstName, lastName: b.lastName ?? "", email: b.email,
      phone: b.phone ?? null, title: b.title ?? null, country: b.country ?? null, source: b.source ?? null, tags: b.tags ?? null },
    include: { account: true },
  });
  return NextResponse.json({ data: { ...contact, createdAt: contact.createdAt.toISOString(), updatedAt: contact.updatedAt.toISOString() } });
}
