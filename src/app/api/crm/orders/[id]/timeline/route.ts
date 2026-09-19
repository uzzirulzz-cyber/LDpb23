import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/orders/[id]/timeline
// Returns all OrderTimelineEvent records for an order, ordered by createdAt asc.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Verify order exists
    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const events = await db.orderTimelineEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
    });

    const data = events.map((e) => ({
      ...e,
      metadata: safeParse(e.metadata),
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
