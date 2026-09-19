import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const sources = await db.waterfallSource.findMany({ include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } }, orderBy: { step: "asc" } });
  return NextResponse.json({ data: sources.map((s) => ({ ...s, config: JSON.parse(s.config), runs: s.runs.map((r) => ({ ...r, startedAt: r.startedAt.toISOString(), completedAt: r.completedAt?.toISOString() ?? null })), createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.type) return NextResponse.json({ error: "name, type required" }, { status: 400 });
  const maxStep = await db.waterfallSource.aggregate({ _max: { step: true } });
  const step = b.step ?? (maxStep._max.step ?? 0) + 1;
  const source = await db.waterfallSource.create({
    data: { name: b.name, type: b.type, priority: step, step, enabled: b.enabled ?? true,
      config: JSON.stringify(b.config ?? {}) },
  });
  return NextResponse.json({ data: { ...source, config: JSON.parse(source.config), runs: [], createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString() } });
}
