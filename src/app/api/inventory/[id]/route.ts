import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "location", "currency"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.stock !== undefined) data.stock = Number(b.stock);
  if (b.reserved !== undefined) data.reserved = Number(b.reserved);
  if (b.reorderLevel !== undefined) data.reorderLevel = Number(b.reorderLevel);
  if (b.cost !== undefined) data.cost = Number(b.cost);
  const item = await db.inventoryItem.update({ where: { id }, data });
  // sync product stock if linked
  if (item.productId) await db.product.update({ where: { id: item.productId }, data: { stock: item.stock } });
  return NextResponse.json({ data: { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
