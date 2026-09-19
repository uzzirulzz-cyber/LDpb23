import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function usd(v: number, c: string) { return c === "AED" ? v / 3.67 : c === "PKR" ? v / 278 : v; }

export async function GET() {
  const [leads, deals, orders, products, messages, activities, reps, invoices, quotes] = await Promise.all([
    db.lead.findMany({ include: { rep: true } }),
    db.deal.findMany(),
    db.order.findMany(),
    db.product.findMany(),
    db.message.findMany(),
    db.activity.findMany({ include: { lead: { select: { id: true, name: true, company: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.rep.findMany(),
    db.invoice.findMany(),
    db.quote.findMany(),
  ]);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new").length;
  const wonDeals = deals.filter((d) => d.stage === "won").length;
  const pipelineValueUsd = leads.filter((l) => !["won", "lost"].includes(l.status)).reduce((s, l) => s + usd(l.value, l.currency), 0);
  const wonValueUsd = leads.filter((l) => l.status === "won").reduce((s, l) => s + usd(l.value, l.currency), 0);
  const closedLeads = leads.filter((l) => l.status === "won" || l.status === "lost").length;
  const conversionRate = closedLeads > 0 ? (wonDeals / closedLeads) * 100 : 0;
  const avgScore = totalLeads > 0 ? leads.reduce((s, l) => s + l.score, 0) / totalLeads : 0;

  // Revenue from orders
  const revenueUsd = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.total, 0);
  const ordersCount = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const refundedOrders = orders.filter((o) => o.status === "refunded").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const aov = completedOrders > 0 ? revenueUsd / completedOrders : 0;

  // Top products by revenue
  const prodRev = new Map<string, { name: string; revenue: number; qty: number }>();
  for (const o of orders) {
    if (o.status !== "completed") continue;
    const items = JSON.parse(o.items) as { name: string; qty: number; price: number }[];
    for (const it of items) {
      const cur = prodRev.get(it.name) ?? { name: it.name, revenue: 0, qty: 0 };
      cur.revenue += it.qty * it.price; cur.qty += it.qty;
      prodRev.set(it.name, cur);
    }
  }
  const topProducts = Array.from(prodRev.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // Leads trend (14 days)
  const now = new Date();
  const trend: { date: string; count: number; won: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000); d.setHours(0, 0, 0, 0);
    const e = new Date(d.getTime() + 86400000);
    trend.push({
      date: d.toISOString().slice(5, 10),
      count: leads.filter((l) => { const c = new Date(l.createdAt); return c >= d && c < e; }).length,
      won: leads.filter((l) => { const c = new Date(l.createdAt); return c >= d && c < e && l.status === "won"; }).length,
    });
  }

  // Revenue trend (14 days)
  const revenueTrend: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000); d.setHours(0, 0, 0, 0);
    const e = new Date(d.getTime() + 86400000);
    const dayOrders = orders.filter((o) => { const c = new Date(o.createdAt); return c >= d && c < e && o.status === "completed"; });
    revenueTrend.push({ date: d.toISOString().slice(5, 10), revenue: Math.round(dayOrders.reduce((s, o) => s + o.total, 0)), orders: dayOrders.length });
  }

  const sourceMap = new Map<string, { count: number; valueUsd: number }>();
  for (const l of leads) { const c = sourceMap.get(l.source) ?? { count: 0, valueUsd: 0 }; c.count++; c.valueUsd += usd(l.value, l.currency); sourceMap.set(l.source, c); }
  const sourceBreakdown = Array.from(sourceMap.entries()).map(([source, v]) => ({ source, ...v })).sort((a, b) => b.count - a.count);

  const funnelOrder = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const funnel = funnelOrder.map((stage) => ({ stage, count: leads.filter((l) => funnelOrder.indexOf(l.status) >= funnelOrder.indexOf(stage)).length }));

  const repPerf = reps.map((r) => {
    const rl = leads.filter((l) => l.assignedTo === r.id);
    return { name: r.name, leads: rl.length, wonUsd: rl.filter((l) => l.status === "won").reduce((s, l) => s + usd(l.value, l.currency), 0), target: r.target };
  }).sort((a, b) => b.wonUsd - a.wonUsd);

  const curMap = new Map<string, { count: number; valueUsd: number }>();
  for (const l of leads) { const c = curMap.get(l.currency) ?? { count: 0, valueUsd: 0 }; c.count++; c.valueUsd += usd(l.value, l.currency); curMap.set(l.currency, c); }
  const currencyMix = Array.from(curMap.entries()).map(([currency, v]) => ({ currency, ...v }));

  // Order status breakdown
  const orderStatusMap = new Map<string, number>();
  for (const o of orders) orderStatusMap.set(o.status, (orderStatusMap.get(o.status) ?? 0) + 1);
  const orderStatusBreakdown = Array.from(orderStatusMap.entries()).map(([status, count]) => ({ status, count }));

  return NextResponse.json({
    data: {
      kpis: { totalLeads, newLeads, wonDeals, wonValueUsd, pipelineValueUsd, conversionRate, avgScore,
        activeDeals: deals.filter((d) => !["won", "lost"].includes(d.stage)).length,
        messagesToday: messages.filter((m) => new Date(m.createdAt).toDateString() === new Date().toDateString()).length,
        revenueUsd: Math.round(revenueUsd), ordersCount, completedOrders, refundedOrders, pendingOrders, aov: Math.round(aov),
        productsCount: products.length, invoicesCount: invoices.length, quotesCount: quotes.length,
      },
      leadsTrend: trend, revenueTrend, sourceBreakdown, funnel, currencyMix,
      orderStatusBreakdown, topProducts, repPerformance: repPerf,
      recentActivities: activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), lead: a.lead ? { ...a.lead } : undefined })),
    },
  });
}
