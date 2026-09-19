import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Unified customer timeline: customer record + their orders + all timeline
// events across those orders + all communication logs for the customer.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const orders = await db.order.findMany({
      where: { customerId: id },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, currency: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const orderIds = orders.map((o) => o.id);

    const [timelineEvents, communications] = await Promise.all([
      db.orderTimelineEvent.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.communicationLog.findMany({
        where: { customerId: id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    type UnifiedEvent = {
      id: string;
      kind: "order" | "timeline" | "communication" | "customer";
      at: string;
      title: string;
      description?: string;
      channel?: string;
      direction?: string;
      actor?: string;
      orderId?: string;
      orderNumber?: string;
      metadata?: Record<string, unknown>;
    };

    const events: UnifiedEvent[] = [];
    events.push({
      id: `customer-${customer.id}`,
      kind: "customer",
      at: customer.createdAt.toISOString(),
      title: "Customer record created",
      description: `${customer.name} (${customer.email})`,
    });
    for (const o of orders) {
      events.push({
        id: `order-${o.id}`,
        kind: "order",
        at: o.createdAt.toISOString(),
        title: `Order ${o.orderNumber} placed`,
        description: `Status: ${o.status} · Payment: ${o.paymentStatus} · ${o.total} ${o.currency}`,
        orderId: o.id,
        orderNumber: o.orderNumber,
      });
    }
    for (const e of timelineEvents) {
      events.push({
        id: `t-${e.id}`,
        kind: "timeline",
        at: e.createdAt.toISOString(),
        title: e.title,
        description: e.description,
        actor: e.actor,
        orderId: e.orderId,
        metadata: e.metadata ? JSON.parse(e.metadata) : {},
      });
    }
    for (const c of communications) {
      events.push({
        id: `c-${c.id}`,
        kind: "communication",
        at: c.createdAt.toISOString(),
        title: `${c.channel.charAt(0).toUpperCase()}${c.channel.slice(1)} ${c.direction}`,
        description: c.message,
        channel: c.channel,
        direction: c.direction,
        orderId: c.orderId ?? undefined,
      });
    }

    events.sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json({
      data: {
        customer,
        orders: orders.map((o) => ({
          ...o,
          createdAt: o.createdAt.toISOString(),
        })),
        events: events.slice(0, 200),
        communications: communications.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
