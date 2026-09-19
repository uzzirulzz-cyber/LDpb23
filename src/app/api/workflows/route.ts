import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const workflows = await db.workflow.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: workflows.map((w) => ({ ...w, actions: JSON.parse(w.actions), lastRunAt: w.lastRunAt?.toISOString() ?? null, createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.trigger) return NextResponse.json({ error: "name, trigger required" }, { status: 400 });
  const wf = await db.workflow.create({
    data: { name: b.name, description: b.description ?? "", trigger: b.trigger,
      actions: JSON.stringify(b.actions ?? []), enabled: b.enabled ?? true },
  });
  return NextResponse.json({ data: { ...wf, actions: JSON.parse(wf.actions), lastRunAt: wf.lastRunAt?.toISOString() ?? null, createdAt: wf.createdAt.toISOString(), updatedAt: wf.updatedAt.toISOString() } });
}
