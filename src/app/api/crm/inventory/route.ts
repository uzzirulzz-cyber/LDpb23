import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lowStockOnly = searchParams.get("lowStock") === "1";
    const location = searchParams.get("location");

    const where: Record<string, unknown> = {};
    if (location) where.location = location;

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        product: { select: { id: true, name: true, slug: true, digital: true, active: true } },
      },
    });

    // Filter low-stock (stock at or below reorderLevel) — done in JS to keep
    // the Prisma call simple and reorderLevel dynamic.
    const filtered = lowStockOnly
      ? items.filter((i) => i.stock <= i.reorderLevel)
      : items;

    const data = filtered.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
