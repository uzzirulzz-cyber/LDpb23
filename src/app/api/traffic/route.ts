import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const events = await db.trafficEvent.findMany({ orderBy: { createdAt: "desc" }, take: 2000 });
  const total = events.length;
  const now = new Date();
  // last 14 days
  const daily: { date: string; visits: number; unique: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000); d.setHours(0, 0, 0, 0);
    const e = new Date(d.getTime() + 86400000);
    const dayEvents = events.filter((ev) => { const c = new Date(ev.createdAt); return c >= d && c < e; });
    const unique = new Set(dayEvents.map((ev) => ev.sessionId)).size;
    daily.push({ date: d.toISOString().slice(5, 10), visits: dayEvents.length, unique });
  }
  // by source
  const sourceMap = new Map<string, number>();
  for (const ev of events) sourceMap.set(ev.source, (sourceMap.get(ev.source) ?? 0) + 1);
  const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  // by path (top pages)
  const pathMap = new Map<string, number>();
  for (const ev of events) pathMap.set(ev.path, (pathMap.get(ev.path) ?? 0) + 1);
  const topPages = Array.from(pathMap.entries()).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  // by country
  const countryMap = new Map<string, number>();
  for (const ev of events) if (ev.country) countryMap.set(ev.country, (countryMap.get(ev.country) ?? 0) + 1);
  const byCountry = Array.from(countryMap.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  // by device
  const deviceMap = new Map<string, number>();
  for (const ev of events) deviceMap.set(ev.device, (deviceMap.get(ev.device) ?? 0) + 1);
  const byDevice = Array.from(deviceMap.entries()).map(([device, count]) => ({ device, count }));
  // avg duration
  const avgDuration = total > 0 ? Math.round(events.reduce((s, e) => s + e.durationSec, 0) / total) : 0;
  const bounceRate = total > 0 ? Math.round((events.filter((e) => e.durationSec < 10).length / total) * 100) : 0;

  return NextResponse.json({ data: { total, daily, bySource, topPages, byCountry, byDevice, avgDuration, bounceRate, recent: events.slice(0, 30).map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })) } });
}
