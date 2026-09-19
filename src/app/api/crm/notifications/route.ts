import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/crm/notifications
// Lists AdminNotifications, optionally filtered by isRead.
// Returns unread count for dashboard badge.
//
// Query: ?isRead=true|false  (omit for all)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isReadParam = searchParams.get("isRead");

    const where: Record<string, unknown> = {};
    if (isReadParam === "true") where.isRead = true;
    if (isReadParam === "false") where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      db.adminNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              verificationStatus: true,
              total: true,
              currency: true,
              customer: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      }),
      db.adminNotification.count({ where: { isRead: false } }),
    ]);

    const data = notifications.map((n) => ({
      ...n,
      metadata: safeParse(n.metadata),
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, count: data.length, unreadCount });
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
