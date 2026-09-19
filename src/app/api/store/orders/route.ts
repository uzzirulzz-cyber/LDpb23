import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/store/orders?customerId=...
// List a customer's orders including items (with parsed licenseKeys).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    }

    const orders = await db.order.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const parsed = orders.map((o) => ({
      ...o,
      fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items.map((i) => ({
        ...i,
        licenseKeys: safeParseArray(i.licenseKeys),
      })),
    }));

    return NextResponse.json({ data: parsed, count: parsed.length });
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
