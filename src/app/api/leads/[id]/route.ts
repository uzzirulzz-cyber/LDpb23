import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LeadStatus } from "@/lib/types";

const STAGES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, assignedTo, score, value, currency } = body;

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (status && STAGES.includes(status)) {
    data.status = status;
    data.stage = status;
  }
  if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
  if (score !== undefined) data.score = Number(score);
  if (value !== undefined) data.value = Number(value);
  if (currency !== undefined) data.currency = currency;

  const lead = await db.lead.update({ where: { id }, data, include: { rep: true } });

  const activities = [];
  if (status && status !== existing.status) {
    activities.push(
      db.activity.create({
        data: { leadId: id, type: "status_change", description: `Status changed from ${existing.status} → ${status}.` },
      })
    );
  }
  if (assignedTo !== undefined && assignedTo !== existing.assignedTo) {
    const rep = assignedTo ? await db.rep.findUnique({ where: { id: assignedTo } }) : null;
    activities.push(
      db.activity.create({
        data: { leadId: id, type: "assigned", description: rep ? `Assigned to ${rep.name}.` : "Lead unassigned." },
      })
    );
  }
  await Promise.all(activities);

  return NextResponse.json({
    data: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() },
  });
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

  return NextResponse.json({
    data: {
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      activities: activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
      messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      deals: deals.map((d) => ({ ...d, createdAt: d.createdAt.toISOString(), closeDate: d.closeDate?.toISOString() ?? null })),
    },
  });
}
