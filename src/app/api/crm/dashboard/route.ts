import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Approximate PKR conversion (1 unit of currency → PKR)
const PKR_RATES: Record<string, number> = {
  PKR: 1,
  USD: 278,
  EUR: 303,
  GBP: 352,
  AED: 76,
  SAR: 74,
};

export function toPkr(v: number, c?: string): number {
  if (!v || Number.isNaN(v)) return 0;
  const rate = PKR_RATES[(c || "PKR").toUpperCase()] ?? 1;
  return Math.round(v * rate);
}

export async function GET() {
  try {
    const [leads, orders, customers, bots, funnelsRunning, apiRunsToday] = await Promise.all([
      db.lead.findMany(),
      db.order.findMany(),
      db.customer.findMany(),
      db.bot.findMany(),
      db.funnelRun.count({ where: { status: "running" } }),
      db.apiRun.count({
        where: {
          startedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    const totalLeads = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const wonLeads = leads.filter((l) => l.status === "won").length;

    const pipelineLeads = leads.filter(
      (l) => l.status !== "won" && l.status !== "lost"
    );
    const pipelineValuePkr = pipelineLeads.reduce(
      (sum, l) => sum + toPkr(l.value, l.currency),
      0
    );

    const paidOrders = orders.filter((o) => o.status === "paid" || o.paymentStatus === "paid");
    const revenuePkr = paidOrders.reduce(
      (sum, o) => sum + toPkr(o.total, o.currency),
      0
    );

    const ordersCount = orders.length;
    const customersCount = customers.length;

    const activeBots = bots.filter(
      (b) => b.status === "online" || b.status === "busy"
    ).length;
    const idleBots = bots.filter((b) => b.status === "idle").length;

    const hasData = {
      leads: totalLeads > 0,
      orders: ordersCount > 0,
      customers: customersCount > 0,
    };

    // ============ Production order metrics ============
    const pendingPayments = orders.filter(
      (o) => o.paymentStatus === "pending" || o.paymentStatus === "processing"
    ).filter((o) => o.paymentStatus === "pending").length;

    const paymentsUnderReview = orders.filter(
      (o) => o.verificationStatus === "pending"
    ).length;

    const verifiedPayments = orders.filter(
      (o) => o.verificationStatus === "verified"
    ).length;

    const failedPayments = orders.filter(
      (o) =>
        o.paymentStatus === "payment_failed" ||
        o.paymentStatus === "failed" ||
        o.paymentStatus === "rejected" ||
        o.verificationStatus === "rejected"
    ).length;

    const processingOrders = orders.filter(
      (o) => o.status === "order_processing" || o.status === "payment_verified"
    ).length;

    const completedOrders = orders.filter(
      (o) => o.status === "order_completed"
    ).length;

    const recentActivities = await db.activity.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        lead: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
      },
    });

    const recentOrders = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    const botStatuses = bots.map((b) => ({
      id: b.id,
      name: b.name,
      role: b.role,
      status: b.status,
      enabled: b.enabled,
      currentJob: b.currentJob,
      lastHeartbeat: b.lastHeartbeat?.toISOString() ?? null,
      executions: b.executions,
      successes: b.successes,
      failures: b.failures,
      latencyMs: b.latencyMs,
    }));

    // Payment verification queue (orders with verificationStatus=pending)
    const verificationQueue = orders
      .filter((o) => o.verificationStatus === "pending")
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 20)
      .map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        verificationStatus: o.verificationStatus,
        total: o.total,
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
        customer: { id: "", name: "", email: "" },
      }));

    // If we have queue items, fetch the related customers in one pass.
    if (verificationQueue.length > 0) {
      const queueOrderIds = verificationQueue.map((o) => o.id);
      const queueOrders = await db.order.findMany({
        where: { id: { in: queueOrderIds } },
        select: {
          id: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      });
      const cMap = new Map(queueOrders.map((o) => [o.id, o.customer]));
      for (const o of verificationQueue) {
        const c = cMap.get(o.id);
        if (c) o.customer = c;
      }
    }

    // Recent unread notifications (3)
    const recentNotifications = await db.adminNotification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Real-time activity stream: recent timeline events across all orders
    const recentTimeline = await db.orderTimelineEvent.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: { id: true, orderNumber: true, customer: { select: { name: true } } },
        },
      },
    });

    // Customer communications count (all-time)
    const customerCommunications = await db.communicationLog.count();

    // Bot activity (executions in last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const botActivity = await db.botExecution.count({
      where: { startedAt: { gte: since } },
    });

    return NextResponse.json({
      data: {
        kpis: {
          totalLeads,
          newLeads,
          wonLeads,
          pipelineValuePkr,
          revenuePkr,
          ordersCount,
          customersCount,
          activeBots,
          idleBots,
          funnelsRunning,
          apiRunsToday,
          // Production order workflow metrics
          pendingPayments,
          paymentsUnderReview,
          verifiedPayments,
          failedPayments,
          processingOrders,
          completedOrders,
          customerCommunications,
          botActivity,
        },
        hasData,
        recentActivities: recentActivities.map((a) => ({
          ...a,
          meta: a.meta ? JSON.parse(a.meta) : {},
          createdAt: a.createdAt.toISOString(),
        })),
        recentOrders: recentOrders.map((o) => ({
          ...o,
          items: [],
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
        })),
        botStatuses,
        verificationQueue,
        recentNotifications: recentNotifications.map((n) => ({
          ...n,
          metadata: n.metadata ? JSON.parse(n.metadata) : {},
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        recentTimeline: recentTimeline.map((e) => ({
          ...e,
          metadata: e.metadata ? JSON.parse(e.metadata) : {},
          createdAt: e.createdAt.toISOString(),
          order: e.order
            ? {
                ...e.order,
                customer: e.order.customer
                  ? { name: e.order.customer.name }
                  : null,
              }
            : null,
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
