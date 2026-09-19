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
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
