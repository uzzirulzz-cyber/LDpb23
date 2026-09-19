import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const low = searchParams.get("low");
  const where: Record<string, unknown> = {};
  if (search) where.OR = [{ sku: { contains: search } }, { name: { contains: search } }];
  if (low === "true") where.stock = { lt: 10 };
  const items = await db.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({ data: items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.sku || !b.name) return NextResponse.json({ error: "sku, name required" }, { status: 400 });
  const item = await db.inventoryItem.create({
    data: { sku: b.sku, name: b.name, productId: b.productId ?? null, stock: Number(b.stock ?? 0),
      reserved: Number(b.reserved ?? 0), reorderLevel: Number(b.reorderLevel ?? 5),
      location: b.location ?? "Warehouse PK", cost: Number(b.cost ?? 0), currency: b.currency ?? "USD" },
  });
  return NextResponse.json({ data: { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() } });
}
