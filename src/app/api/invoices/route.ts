import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  const invoices = await db.invoice.findMany({ where, include: { account: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: invoices.map((i) => ({ ...i, items: JSON.parse(i.items), dueDate: i.dueDate?.toISOString() ?? null, paidAt: i.paidAt?.toISOString() ?? null, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  const items = b.items ?? [];
  const total = items.reduce((s: number, it: { qty: number; price: number }) => s + it.qty * it.price, 0);
  const now = new Date();
  const count = await db.invoice.count();
  const invoice = await db.invoice.create({
    data: { number: `INV-${2001 + count}`, accountId: b.accountId ?? null, contactId: b.contactId ?? null, orderId: b.orderId ?? null,
      subject: b.subject ?? "New Invoice", status: b.status ?? "draft", currency: b.currency ?? "USD", total,
      items: JSON.stringify(items), dueDate: b.dueDate ? new Date(b.dueDate) : new Date(now.getTime() + 30 * 86400000),
      paidAt: b.status === "paid" ? now : null },
    include: { account: true },
  });
  return NextResponse.json({ data: { ...invoice, items: JSON.parse(invoice.items), dueDate: invoice.dueDate?.toISOString() ?? null, paidAt: invoice.paidAt?.toISOString() ?? null, createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() } });
}
