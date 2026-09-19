import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["subject", "status", "currency", "accountId", "contactId", "orderId"]) if (b[k] !== undefined) data[k] = b[k] || null;
  if (b.items !== undefined) { const items = b.items; data.items = JSON.stringify(items); data.total = items.reduce((s: number, it: { qty: number; price: number }) => s + it.qty * it.price, 0); }
  if (b.dueDate) data.dueDate = new Date(b.dueDate);
  if (b.status === "paid") data.paidAt = new Date();
  const invoice = await db.invoice.update({ where: { id }, data, include: { account: true } });
  return NextResponse.json({ data: { ...invoice, items: JSON.parse(invoice.items), dueDate: invoice.dueDate?.toISOString() ?? null, paidAt: invoice.paidAt?.toISOString() ?? null, createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
