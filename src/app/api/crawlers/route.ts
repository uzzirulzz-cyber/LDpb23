import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const crawlers = await db.crawler.findMany({ include: { _count: { select: { results: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: crawlers.map((c) => ({ ...c, config: JSON.parse(c.config), lastRunAt: c.lastRunAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.targetUrl) return NextResponse.json({ error: "name, targetUrl required" }, { status: 400 });
  const crawler = await db.crawler.create({
    data: { name: b.name, targetUrl: b.targetUrl, schedule: b.schedule ?? "manual", config: JSON.stringify(b.config ?? {}) },
  });
  return NextResponse.json({ data: { ...crawler, config: JSON.parse(crawler.config), lastRunAt: null, createdAt: crawler.createdAt.toISOString(), updatedAt: crawler.updatedAt.toISOString() } });
}
