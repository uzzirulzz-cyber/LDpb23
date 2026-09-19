import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (b.status && STAGES.includes(b.status)) { data.status = b.status; data.stage = b.status; }
  if (b.assignedTo !== undefined) data.assignedTo = b.assignedTo || null;
  if (b.score !== undefined) data.score = Number(b.score);
  if (b.value !== undefined) data.value = Number(b.value);
  if (b.currency !== undefined) data.currency = b.currency;
  const lead = await db.lead.update({ where: { id }, data, include: { rep: true } });
  const acts = [];
  if (b.status && b.status !== existing.status) acts.push(db.activity.create({ data: { leadId: id, type: "status_change", description: `Status changed ${existing.status} → ${b.status}.` } }));
  if (b.assignedTo !== undefined && b.assignedTo !== existing.assignedTo) { const rep = b.assignedTo ? await db.rep.findUnique({ where: { id: b.assignedTo } }) : null; acts.push(db.activity.create({ data: { leadId: id, type: "assigned", description: rep ? `Assigned to ${rep.name}.` : "Lead unassigned." } })); }
  await Promise.all(acts);
  return NextResponse.json({ data: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id }, include: { rep: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  const [activities, messages, deals] = await Promise.all([
    db.activity.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.message.findMany({ where: { leadId: id }, orderBy: { createdAt: "asc" } }),
    db.deal.findMany({ where: { leadId: id } }),
  ]);
  return NextResponse.json({ data: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString(),
    activities: activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    deals: deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), closeDate: d.closeDate?.toISOString() ?? null })) } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
