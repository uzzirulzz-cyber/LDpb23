import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const active = searchParams.get("active");
  const where: Record<string, unknown> = {};
  if (category && category !== "all") where.category = category;
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;
  if (search) where.OR = [{ name: { contains: search } }, { sku: { contains: search } }, { description: { contains: search } }];
  const products = await db.product.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: products.map((p) => ({ ...p, images: JSON.parse(p.images), variants: JSON.parse(p.variants), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.sku) return NextResponse.json({ error: "name, sku required" }, { status: 400 });
  const slug = b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const product = await db.product.create({
    data: { name: b.name, slug, sku: b.sku, category: b.category ?? "General", subcategory: b.subcategory ?? null,
      price: Number(b.price ?? 0), currency: b.currency ?? "USD", digital: b.digital ?? true,
      deliveryType: b.deliveryType ?? "Instant Auto-Email", stock: Number(b.stock ?? 0),
      description: b.description ?? "", images: JSON.stringify(b.images ?? []), variants: JSON.stringify(b.variants ?? []),
      active: b.active ?? true, rating: Number(b.rating ?? 0) },
  });
  // create matching inventory item
  await db.inventoryItem.create({ data: { sku: product.sku, name: product.name, productId: product.id, stock: product.stock, reserved: 0, reorderLevel: product.digital ? 50 : 5, location: product.digital ? "Digital Vault" : "Warehouse PK", cost: Number((product.price * 0.6).toFixed(2)), currency: product.currency } });
  return NextResponse.json({ data: { ...product, images: JSON.parse(product.images), variants: JSON.parse(product.variants), createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString() } });
}
