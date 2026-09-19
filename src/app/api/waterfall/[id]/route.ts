import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "type", "priority", "step"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.enabled !== undefined) data.enabled = Boolean(b.enabled);
  if (b.config !== undefined) data.config = JSON.stringify(b.config);
  let run = null;
  if (b.runNow) {
    run = await db.enrichmentRun.create({ data: { sourceId: id, status: "running", startedAt: new Date() } });
    // simulate completion
    const found = Math.floor(Math.random() * 200) + 10;
    await db.enrichmentRun.update({ where: { id: run.id }, data: { status: "completed", found, enriched: Math.floor(found * 0.7), completedAt: new Date() } });
    await db.waterfallSource.update({ where: { id }, data: { found: { increment: found }, converted: { increment: Math.floor(found * 0.1) } } });
  }
  const source = await db.waterfallSource.update({ where: { id }, data });
  return NextResponse.json({ data: { ...source, config: JSON.parse(source.config), runs: [], createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString() }, runCreated: !!run });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.waterfallSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
