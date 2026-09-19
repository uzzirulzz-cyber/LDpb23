import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  const quotes = await db.quote.findMany({ where, include: { account: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: quotes.map((q) => ({ ...q, items: JSON.parse(q.items), validUntil: q.validUntil?.toISOString() ?? null, createdAt: q.createdAt.toISOString(), updatedAt: q.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const items = b.items ?? [];
  const total = items.reduce((s: number, it: { qty: number; price: number }) => s + it.qty * it.price, 0);
  const now = new Date();
  const count = await db.quote.count();
  const quote = await db.quote.create({
    data: { number: `Q-${1001 + count}`, accountId: b.accountId ?? null, contactId: b.contactId ?? null,
      subject: b.subject ?? "New Quote", status: b.status ?? "draft", currency: b.currency ?? "USD", total,
      items: JSON.stringify(items), validUntil: b.validUntil ? new Date(b.validUntil) : new Date(now.getTime() + 14 * 86400000) },
    include: { account: true },
  });
  return NextResponse.json({ data: { ...quote, items: JSON.parse(quote.items), validUntil: quote.validUntil?.toISOString() ?? null, createdAt: quote.createdAt.toISOString(), updatedAt: quote.updatedAt.toISOString() } });
}
