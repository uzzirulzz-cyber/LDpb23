import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["subject", "status", "currency", "accountId", "contactId"]) if (b[k] !== undefined) data[k] = b[k] || null;
  if (b.items !== undefined) { const items = b.items; data.items = JSON.stringify(items); data.total = items.reduce((s: number, it: { qty: number; price: number }) => s + it.qty * it.price, 0); }
  if (b.validUntil) data.validUntil = new Date(b.validUntil);
  const quote = await db.quote.update({ where: { id }, data, include: { account: true } });
  return NextResponse.json({ data: { ...quote, items: JSON.parse(quote.items), validUntil: quote.validUntil?.toISOString() ?? null, createdAt: quote.createdAt.toISOString(), updatedAt: quote.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.quote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
