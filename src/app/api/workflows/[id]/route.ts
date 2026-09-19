import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "description", "trigger"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.actions !== undefined) data.actions = JSON.stringify(b.actions);
  if (b.enabled !== undefined) data.enabled = Boolean(b.enabled);
  if (b.runNow) { data.runs = { increment: 1 }; data.lastRunAt = new Date(); }
  const wf = await db.workflow.update({ where: { id }, data });
  return NextResponse.json({ data: { ...wf, actions: JSON.parse(wf.actions), lastRunAt: wf.lastRunAt?.toISOString() ?? null, createdAt: wf.createdAt.toISOString(), updatedAt: wf.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.workflow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
