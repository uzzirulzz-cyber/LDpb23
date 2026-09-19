import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/customer/[id]/timeline
// Unified customer timeline: merges orders + communications + per-order timeline
// events into a single chronological feed.
//
// Returns: { data: [...sorted by timestamp desc], customer: {...} }
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        city: true,
        createdAt: true,
      },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Pull all orders for this customer (with their timeline events + comms)
    const orders = await db.order.findMany({
      where: { customerId: id },
      include: {
        items: true,
        timeline: { orderBy: { createdAt: "asc" } },
        communications: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    type TimelineItem = {
      id: string;
      timestamp: string;
      kind: "order" | "order_timeline" | "communication";
      orderId: string | null;
      orderNumber: string | null;
      title: string;
      description: string;
      actor: string | null;
      channel: string | null;
      metadata: Record<string, unknown>;
    };

    const events: TimelineItem[] = [];

    for (const order of orders) {
      // 1. Order creation event
      events.push({
        id: `order_${order.id}`,
        timestamp: order.createdAt.toISOString(),
        kind: "order",
        orderId: order.id,
        orderNumber: order.orderNumber,
        title: `Order ${order.orderNumber} placed`,
        description: `Status: ${order.status} · Total: ${order.total} ${order.currency} · ${order.items.length} item(s)`,
        actor: `customer:${id}`,
        channel: null,
        metadata: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          currency: order.currency,
          itemCount: order.items.length,
          items: order.items.map((it) => ({
            name: it.name,
            price: it.price,
            quantity: it.quantity,
          })),
        },
      });

      // 2. All timeline events for this order
      for (const te of order.timeline) {
        events.push({
          id: `te_${te.id}`,
          timestamp: te.createdAt.toISOString(),
          kind: "order_timeline",
          orderId: order.id,
          orderNumber: order.orderNumber,
          title: te.title,
          description: te.description,
          actor: te.actor,
          channel: null,
          metadata: safeParse(te.metadata),
        });
      }

      // 3. All communications for this order
      for (const c of order.communications) {
        events.push({
          id: `comm_${c.id}`,
          timestamp: c.createdAt.toISOString(),
          kind: "communication",
          orderId: order.id,
          orderNumber: order.orderNumber,
          title: `${c.channel.toUpperCase()} ${c.direction} — ${c.templateKey || c.subject || "message"}`,
          description: c.message.slice(0, 200),
          actor: c.staffId ? `staff:${c.staffId}` : c.botId ? `bot:${c.botId}` : "system",
          channel: c.channel,
          metadata: {
            recipient: c.recipient,
            subject: c.subject,
            templateKey: c.templateKey,
            providerMsgId: c.providerMsgId,
            deliveryStatus: c.deliveryStatus,
            errorMessage: c.errorMessage,
          },
        });
      }
    }

    // Also pull customer-level communications (no orderId)
    const standaloneComms = await db.communicationLog.findMany({
      where: { customerId: id, orderId: null },
      orderBy: { createdAt: "desc" },
    });
    for (const c of standaloneComms) {
      events.push({
        id: `comm_${c.id}`,
        timestamp: c.createdAt.toISOString(),
        kind: "communication",
        orderId: null,
        orderNumber: null,
        title: `${c.channel.toUpperCase()} ${c.direction} — ${c.templateKey || c.subject || "message"}`,
        description: c.message.slice(0, 200),
        actor: c.staffId ? `staff:${c.staffId}` : c.botId ? `bot:${c.botId}` : "system",
        channel: c.channel,
        metadata: {
          recipient: c.recipient,
          subject: c.subject,
          templateKey: c.templateKey,
          providerMsgId: c.providerMsgId,
          deliveryStatus: c.deliveryStatus,
        },
      });
    }

    // Sort by timestamp descending
    events.sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));

    return NextResponse.json({
      data: events,
      count: events.length,
      customer: {
        ...customer,
        createdAt: customer.createdAt.toISOString(),
      },
      stats: {
        orders: orders.length,
        communications: events.filter((e) => e.kind === "communication").length,
        timelineEvents: events.filter((e) => e.kind === "order_timeline").length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
