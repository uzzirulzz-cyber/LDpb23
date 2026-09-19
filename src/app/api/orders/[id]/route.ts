import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.status) data.status = b.status;
  if (b.paymentMethod) data.paymentMethod = b.paymentMethod;
  if (b.total !== undefined) data.total = Number(b.total);
  const order = await db.order.update({ where: { id }, data });
  return NextResponse.json({ data: { ...order, items: JSON.parse(order.items), licenseKeys: JSON.parse(order.licenseKeys), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
