import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DashboardData } from "@/lib/types";

function usd(value: number, currency: string): number {
  if (currency === "USD") return value;
  if (currency === "AED") return value / 3.67;
  if (currency === "PKR") return value / 278;
  return value;
}

export async function GET() {
  const now = new Date();
  const dayMs = 86400000;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const [leads, deals, messages, activities, reps] = await Promise.all([
    db.lead.findMany({ include: { rep: true }, orderBy: { createdAt: "desc" } }),
    db.deal.findMany(),
    db.message.findMany(),
    db.activity.findMany({ include: { lead: { select: { id: true, name: true, company: true } } }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.rep.findMany(),
  ]);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "new").length;
  const wonDeals = deals.filter((d) => d.stage === "won").length;

  const pipelineValueUsd = leads
    .filter((l) => !["won", "lost"].includes(l.status))
    .reduce((sum, l) => sum + usd(l.value, l.currency), 0);

  const wonValueUsd = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + usd(l.value, l.currency), 0);

  const closedLeads = leads.filter((l) => l.status === "won" || l.status === "lost").length;
  const conversionRate = closedLeads > 0 ? (wonDeals / closedLeads) * 100 : 0;

  const avgScore = totalLeads > 0 ? leads.reduce((s, l) => s + l.score, 0) / totalLeads : 0;
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage)).length;
  const messagesToday = messages.filter((m) => new Date(m.createdAt) >= startToday).length;

  // Leads trend (last 14 days)
  const trend: { date: string; count: number; won: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * dayMs);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + dayMs);
    const count = leads.filter((l) => {
      const c = new Date(l.createdAt);
      return c >= dayStart && c < dayEnd;
    }).length;
    const won = leads.filter((l) => {
      const c = new Date(l.createdAt);
      return c >= dayStart && c < dayEnd && l.status === "won";
    }).length;
    trend.push({ date: dayStart.toISOString().slice(5, 10), count, won });
  }

  // Source breakdown
  const sourceMap = new Map<string, { count: number; valueUsd: number }>();
  for (const l of leads) {
    const cur = sourceMap.get(l.source) ?? { count: 0, valueUsd: 0 };
    cur.count += 1;
    cur.valueUsd += usd(l.value, l.currency);
    sourceMap.set(l.source, cur);
  }
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.count - a.count);

  // Funnel
  const funnelOrder = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const funnel = funnelOrder.map((stage) => ({
    stage,
    count: leads.filter((l) => {
      const idx = funnelOrder.indexOf(l.status as string);
      const sIdx = funnelOrder.indexOf(stage);
      return idx >= sIdx;
    }).length,
  }));

  // Status breakdown
  const statusMap = new Map<string, number>();
  for (const l of leads) statusMap.set(l.status, (statusMap.get(l.status) ?? 0) + 1);
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // Rep performance
  const repPerf = reps.map((r) => {
    const repLeads = leads.filter((l) => l.assignedTo === r.id);
    const wonUsd = repLeads
      .filter((l) => l.status === "won")
      .reduce((s, l) => s + usd(l.value, l.currency), 0);
    return { name: r.name, leads: repLeads.length, wonUsd, target: r.target };
  }).sort((a, b) => b.wonUsd - a.wonUsd);

  // Currency mix
  const curMap = new Map<string, { count: number; valueUsd: number }>();
  for (const l of leads) {
    const c = curMap.get(l.currency) ?? { count: 0, valueUsd: 0 };
    c.count += 1;
    c.valueUsd += usd(l.value, l.currency);
    curMap.set(l.currency, c);
  }
  const currencyMix = Array.from(curMap.entries()).map(([currency, v]) => ({ currency, ...v }));

  const data: DashboardData = {
    kpis: {
      totalLeads,
      newLeads,
      wonDeals,
      wonValueUsd,
      pipelineValueUsd,
      conversionRate,
      avgScore,
      activeDeals,
      messagesToday,
    },
    leadsTrend: trend,
    sourceBreakdown,
    funnel,
    statusBreakdown,
    recentActivities: activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      lead: a.lead ? { ...a.lead, company: a.lead.company } : undefined,
    })),
    repPerformance: repPerf,
    currencyMix,
  };

  return NextResponse.json({ data, wonValueUsd });
}
