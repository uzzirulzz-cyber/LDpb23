import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const crawler = await db.crawler.findUnique({ where: { id }, include: { results: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!crawler) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ...crawler, config: JSON.parse(crawler.config), lastRunAt: crawler.lastRunAt?.toISOString() ?? null, createdAt: crawler.createdAt.toISOString(), updatedAt: crawler.updatedAt.toISOString(), results: crawler.results.map((r) => ({ ...r, data: JSON.parse(r.data), createdAt: r.createdAt.toISOString() })) } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "targetUrl", "schedule", "status"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.config !== undefined) data.config = JSON.stringify(b.config);
  let newResults = 0;
  if (b.runNow) {
    data.status = "running";
    data.lastRunAt = new Date();
    // simulate crawl
    newResults = Math.floor(Math.random() * 8) + 2;
    const titles = ["Steam Deal", "Reddit Post", "YouTube Channel", "SaaS Listing", "Forum Thread", "Price Drop", "New Release", "Bundle Offer"];
    for (let i = 0; i < newResults; i++) {
      const crawler = await db.crawler.findUnique({ where: { id } });
      await db.crawlResult.create({ data: { crawlerId: id, title: `${titles[Math.floor(Math.random() * titles.length)]} ${Math.floor(Math.random() * 9000) + 1000}`, url: `${crawler?.targetUrl}/${Math.floor(Math.random() * 999)}`, price: Math.random() > 0.5 ? Math.floor(Math.random() * 80) + 5 : null, data: JSON.stringify({ matched: titles[Math.floor(Math.random() * titles.length)], score: Math.floor(Math.random() * 50) + 50 }) } });
    }
    data.status = "completed";
    data.found = { increment: newResults };
  }
  const crawler = await db.crawler.update({ where: { id }, data });
  return NextResponse.json({ data: { ...crawler, config: JSON.parse(crawler.config), lastRunAt: crawler.lastRunAt?.toISOString() ?? null, createdAt: crawler.createdAt.toISOString(), updatedAt: crawler.updatedAt.toISOString() }, newResults });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.crawler.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
