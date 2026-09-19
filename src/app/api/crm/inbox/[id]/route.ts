import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const thread = await db.inboxThread.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...thread,
        messages: thread.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
        lastMessageAt: thread.lastMessageAt.toISOString(),
        createdAt: thread.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.unread !== undefined) data.unread = body.unread;
    if (body.subject !== undefined) data.subject = body.subject;
    if (body.customerName !== undefined) data.customerName = body.customerName;

    const thread = await db.inboxThread.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "inboxThread",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...thread,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        createdAt: thread.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const thread = await db.inboxThread.findUnique({ where: { id } });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const now = new Date();
    const message = await db.inboxMessage.create({
      data: {
        threadId: id,
        direction: body.direction ?? "outbound",
        content: body.content,
        channel: body.channel ?? thread.channel,
      },
    });

    await db.inboxThread.update({
      where: { id },
      data: { lastMessageAt: now },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "send_message",
        entity: "inboxThread",
        entityId: id,
        meta: JSON.stringify({
          messageId: message.id,
          direction: message.direction,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...message,
          createdAt: message.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
