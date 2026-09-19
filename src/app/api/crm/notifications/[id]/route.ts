import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/crm/notifications/[id]
// Body: { isRead: true, readBy: <adminUserId> }
// Marks a notification as read.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isRead, readBy } = body as { isRead?: boolean; readBy?: string };

    const existing = await db.adminNotification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (isRead !== undefined) {
      data.isRead = Boolean(isRead);
      data.readAt = isRead ? new Date() : null;
      data.readBy = isRead ? (readBy ?? null) : null;
    }

    const updated = await db.adminNotification.update({ where: { id }, data });

    // Audit log
    await db.auditLog.create({
      data: {
        actor: readBy ? `staff:${readBy}` : "system",
        actorId: readBy ?? null,
        action: isRead ? "notification_read" : "notification_unread",
        entity: "notification",
        entityId: id,
        meta: JSON.stringify({ orderId: updated.orderId, type: updated.type }),
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        metadata: safeParse(updated.metadata),
        readAt: updated.readAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/crm/notifications/[id]
// Dismiss / delete a notification.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await db.adminNotification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await db.adminNotification.delete({ where: { id } });

    // Audit log
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;
    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "notification_dismissed",
        entity: "notification",
        entityId: id,
        meta: JSON.stringify({ orderId: existing.orderId, type: existing.type }),
      },
    });

    return NextResponse.json({ data: { id, dismissed: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
