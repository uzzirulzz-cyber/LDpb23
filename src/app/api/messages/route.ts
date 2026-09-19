import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const messages = await db.message.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    data: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { leadId, channel, content } = body as { leadId: string; channel: string; content: string };

  if (!leadId || !channel || !content) {
    return NextResponse.json({ error: "leadId, channel and content required" }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const message = await db.message.create({
    data: {
      leadId,
      channel,
      direction: "outbound",
      content,
      status: "sent",
    },
  });

  await db.activity.create({
    data: {
      leadId,
      type: "message",
      description: `Outbound ${channel} message sent to ${lead.name}.`,
    },
  });

  return NextResponse.json({ data: { ...message, createdAt: message.createdAt.toISOString() } });
}
