import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/store/products
// List active storefront products. Supports:
//   ?category=...     — filter by category (exact match)
//   ?q=...            — case-insensitive search across name, sku, description
//   ?digital=true|false — filter digital/physical
//   ?limit=...        — cap number of results (default 100)
// JSON fields (images, variants) are parsed before serialization.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim();
    const q = searchParams.get("q")?.trim();
    const digitalParam = searchParams.get("digital");
    const limitParam = searchParams.get("limit");

    const where: {
      active: boolean;
      category?: string;
      digital?: boolean;
      OR?: Array<Record<string, { contains: string; mode?: "insensitive" }>>;
    } = { active: true };

    if (category) where.category = category;
    if (digitalParam === "true") where.digital = true;
    if (digitalParam === "false") where.digital = false;

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { subcategory: { contains: q, mode: "insensitive" } },
      ];
    }

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100;

    const products = await db.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });

    const parsed = products.map((p) => ({
      ...p,
      images: safeParseArray(p.images),
      variants: safeParseArray(p.variants),
    }));

    return NextResponse.json({
      data: parsed,
      count: parsed.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParseArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
