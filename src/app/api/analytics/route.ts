import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function usd(value: number, currency: string): number {
  if (currency === "USD") return value;
  if (currency === "AED") return value / 3.67;
  if (currency === "PKR") return value / 278;
  return value;
}

export async function GET() {
  const [leads, deals, reps] = await Promise.all([
    db.lead.findMany({ include: { rep: true } }),
    db.deal.findMany(),
    db.rep.findMany(),
  ]);

  const sourceMap = new Map<string, { total: number; won: number; lost: number; qualified: number }>();
  for (const l of leads) {
    const s = sourceMap.get(l.source) ?? { total: 0, won: 0, lost: 0, qualified: 0 };
    s.total += 1;
    if (l.status === "won") s.won += 1;
    if (l.status === "lost") s.lost += 1;
    if (["qualified", "proposal", "negotiation", "won"].includes(l.status)) s.qualified += 1;
    sourceMap.set(l.source, s);
  }
  const sourceWaterfall = Array.from(sourceMap.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const conversionBySource = sourceWaterfall.map((s) => ({
    source: s.source,
    count: s.total,
    rate: s.total > 0 ? (s.won / s.total) * 100 : 0,
  }));

  const now = new Date();
  const monthlyRevenue: { month: string; revenueUsd: number; deals: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthWon = leads.filter((l) => {
      const c = new Date(l.createdAt);
      return c >= monthStart && c < monthEnd && l.status === "won";
    });
    const rev = monthWon.reduce((s, l) => s + usd(l.value, l.currency), 0);
    monthlyRevenue.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      revenueUsd: Math.round(rev),
      deals: monthWon.length,
    });
  }

  const buckets = [
    { bucket: "0-20", min: 0, max: 20 },
    { bucket: "21-40", min: 21, max: 40 },
    { bucket: "41-60", min: 41, max: 60 },
    { bucket: "61-80", min: 61, max: 80 },
    { bucket: "81-100", min: 81, max: 100 },
  ];
  const scoreDistribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: leads.filter((l) => l.score >= b.min && l.score <= b.max).length,
  }));

  const repLeaderboard = reps
    .map((r) => {
      const repLeads = leads.filter((l) => l.assignedTo === r.id);
      const won = repLeads.filter((l) => l.status === "won");
      const wonUsd = won.reduce((s, l) => s + usd(l.value, l.currency), 0);
      return {
        id: r.id,
        name: r.name,
        leads: repLeads.length,
        won: won.length,
        wonUsd: Math.round(wonUsd),
        target: r.target,
        region: r.region,
      };
    })
    .sort((a, b) => b.wonUsd - a.wonUsd);

  return NextResponse.json({
    data: { sourceWaterfall, conversionBySource, monthlyRevenue, scoreDistribution, repLeaderboard },
  });
}
