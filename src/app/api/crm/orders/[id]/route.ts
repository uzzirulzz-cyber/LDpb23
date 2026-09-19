import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transitionOrder, addTimelineEvent, canTransition } from "@/lib/order-state";
import {
  verifyPayment,
  rejectPayment,
  completeOrder,
} from "@/lib/payment-bot";

type Params = { params: Promise<{ id: string }> };

function safeParseArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function safeParseObject(raw: string | null | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ─── GET: full order detail ──────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            country: true,
            city: true,
            address: true,
          },
        },
        timeline: { orderBy: { createdAt: "asc" } },
        communications: { orderBy: { createdAt: "desc" } },
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...order,
        adminNotes: safeParseArray(order.adminNotes),
        auditHistory: safeParseArray(order.auditHistory),
        fxTimestamp: order.fxTimestamp?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map((it) => ({
          ...it,
          licenseKeys: safeParseArray(it.licenseKeys),
        })),
        timeline: order.timeline.map((e) => ({
          ...e,
          metadata: safeParseObject(e.metadata),
          createdAt: e.createdAt.toISOString(),
        })),
        communications: order.communications.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        })),
        notifications: order.notifications.map((n) => ({
          ...n,
          metadata: safeParseObject(n.metadata),
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH: state transition / actions ───────────────────────────
// Body: { action: "verify"|"reject"|"complete"|"cancel"|"assign"|"note", adminUserId, ... }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, adminUserId } = body as {
      action?: string;
      adminUserId?: string;
      [k: string]: unknown;
    };

    if (!action) {
      return NextResponse.json({ error: "Missing 'action' in body" }, { status: 400 });
    }

    const existing = await db.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const actor = adminUserId ? `staff:${adminUserId}` : "system";

    switch (action) {
      // ── verify: Super Admin verifies payment ──
      case "verify": {
        if (!adminUserId) {
          return NextResponse.json({ error: "adminUserId required for verify" }, { status: 400 });
        }
        const result = await verifyPayment(id, adminUserId);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ data: { ok: true, order: serializeOrderBrief(result.order) } });
      }

      // ── reject: Super Admin rejects payment ──
      case "reject": {
        if (!adminUserId) {
          return NextResponse.json({ error: "adminUserId required for reject" }, { status: 400 });
        }
        const reason = String(body.reason || "Payment could not be verified");
        const result = await rejectPayment(id, adminUserId, reason);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ data: { ok: true, order: serializeOrderBrief(result.order) } });
      }

      // ── complete: mark order as completed ──
      case "complete": {
        const result = await completeOrder(id, {
          actor: adminUserId ? `staff:${adminUserId}` : "system",
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ data: { ok: true, order: serializeOrderBrief(result.order) } });
      }

      // ── cancel: transition to order_cancelled ──
      case "cancel": {
        const reason = String(body.reason || "Cancelled by staff");
        if (canTransition(existing.status, "order_cancelled")) {
          await transitionOrder(id, "order_cancelled", actor, {
            paymentStatus: existing.paymentStatus === "verified" ? "verified" : "payment_cancelled",
            metadata: { reason, adminUserId: adminUserId ?? null },
          });
        } else {
          await db.order.update({
            where: { id },
            data: {
              status: "order_cancelled",
              paymentStatus:
                existing.paymentStatus === "verified" ? "verified" : "payment_cancelled",
            },
          });
          await addTimelineEvent(
            id,
            "status_changed",
            "Order Cancelled",
            `Order cancelled. Reason: ${reason}`,
            actor,
            { reason, adminUserId: adminUserId ?? null }
          );
        }
        const updated = await db.order.findUnique({ where: { id } });
        return NextResponse.json({
          data: {
            ok: true,
            order: updated
              ? {
                  id: updated.id,
                  status: updated.status,
                  paymentStatus: updated.paymentStatus,
                }
              : null,
          },
        });
      }

      // ── assign: set assignedStaffId ──
      case "assign": {
        const staffId = String(body.staffId || body.assignedStaffId || "");
        if (!staffId) {
          return NextResponse.json({ error: "staffId required for assign" }, { status: 400 });
        }
        const order = await db.order.update({
          where: { id },
          data: { assignedStaffId: staffId },
        });
        await addTimelineEvent(
          id,
          "human_action",
          "Order Assigned",
          `Order assigned to staff ${staffId}.`,
          actor,
          { staffId }
        );
        await db.auditLog.create({
          data: {
            actor,
            actorId: adminUserId ?? null,
            action: "order_assigned",
            entity: "order",
            entityId: id,
            meta: JSON.stringify({ orderNumber: order.orderNumber, staffId }),
          },
        });
        return NextResponse.json({
          data: { ok: true, order: { id: order.id, assignedStaffId: order.assignedStaffId } },
        });
      }

      // ── note: append to adminNotes JSON array ──
      case "note": {
        const note = String(body.note || "");
        if (!note) {
          return NextResponse.json({ error: "note required" }, { status: 400 });
        }
        const notes = safeParseArray(existing.adminNotes) as Array<Record<string, unknown>>;
        notes.push({
          id: `note_${Date.now()}`,
          text: note,
          adminUserId: adminUserId ?? null,
          createdAt: new Date().toISOString(),
        });
        const order = await db.order.update({
          where: { id },
          data: { adminNotes: JSON.stringify(notes) },
        });
        await addTimelineEvent(
          id,
          "note_added",
          "Note Added",
          note,
          actor,
          { note, adminUserId: adminUserId ?? null }
        );
        await db.auditLog.create({
          data: {
            actor,
            actorId: adminUserId ?? null,
            action: "order_note_added",
            entity: "order",
            entityId: id,
            meta: JSON.stringify({ orderNumber: order.orderNumber, note }),
          },
        });
        return NextResponse.json({
          data: { ok: true, notes: safeParseArray(order.adminNotes) },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[crm/orders/[id]] PATCH error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function serializeOrderBrief(order: {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  verificationStatus: string;
} | null): Record<string, unknown> | null {
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    verificationStatus: order.verificationStatus,
  };
}
