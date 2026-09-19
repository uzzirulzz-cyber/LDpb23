import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  for (const k of ["name", "category", "subcategory", "currency", "deliveryType", "description"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.price !== undefined) data.price = Number(b.price);
  if (b.stock !== undefined) data.stock = Number(b.stock);
  if (b.digital !== undefined) data.digital = Boolean(b.digital);
  if (b.active !== undefined) data.active = Boolean(b.active);
  if (b.images !== undefined) data.images = JSON.stringify(b.images);
  if (b.variants !== undefined) data.variants = JSON.stringify(b.variants);
  const product = await db.product.update({ where: { id }, data });
  // sync inventory
  await db.inventoryItem.updateMany({ where: { sku: existing.sku }, data: { name: product.name, stock: product.stock } });
  return NextResponse.json({ data: { ...product, images: JSON.parse(product.images), variants: JSON.parse(product.variants), createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString() } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id } });
  await db.product.delete({ where: { id } });
  if (p) await db.inventoryItem.deleteMany({ where: { sku: p.sku } });
  return NextResponse.json({ ok: true });
}
