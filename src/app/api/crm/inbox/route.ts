import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const channel = searchParams.get("channel");
    const leadId = searchParams.get("leadId");
    const contactId = searchParams.get("contactId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;

    const threads = await db.inboxThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
    });

    const data = threads.map((t) => ({
      ...t,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const thread = await db.inboxThread.create({
      data: {
        leadId: body.leadId ?? null,
        contactId: body.contactId ?? null,
        customerName: body.customerName,
        channel: body.channel,
        subject: body.subject ?? "",
        status: body.status ?? "open",
        unread: body.unread ?? 0,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "inboxThread",
        entityId: thread.id,
        meta: JSON.stringify({ customerName: thread.customerName, channel: thread.channel }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...thread,
          lastMessageAt: thread.lastMessageAt.toISOString(),
          createdAt: thread.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
