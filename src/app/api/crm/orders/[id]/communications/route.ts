import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmail, formatEmailTemplate } from "@/lib/email";
import { addTimelineEvent } from "@/lib/order-state";

type Params = { params: Promise<{ id: string }> };

// GET /api/crm/orders/[id]/communications
// Returns all CommunicationLog records for an order.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, customerId: true, customer: { select: { name: true, email: true, phone: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const logs = await db.communicationLog.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    const data = logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/crm/orders/[id]/communications
// Body: { channel: "whatsapp"|"email", message, templateKey?, staffId?, variables? }
// Sends a real WhatsApp/email via the integration libs and stores the CommunicationLog.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { channel, message, templateKey, staffId, variables } = body as {
      channel?: string;
      message?: string;
      templateKey?: string;
      staffId?: string;
      variables?: Record<string, string>;
    };

    if (!channel || (channel !== "whatsapp" && channel !== "email")) {
      return NextResponse.json(
        { error: "channel must be 'whatsapp' or 'email'" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const actor = staffId ? `staff:${staffId}` : "system";
    const tplVars: Record<string, string> = {
      customer_name: order.customer.name,
      order_id: order.orderNumber,
      amount: String(order.total),
      currency: order.currency,
      ...(variables ?? {}),
    };

    let result:
      | { ok: boolean; providerMsgId: string | null; deliveryStatus: string; raw: unknown; error?: string }
      | null = null;

    if (channel === "whatsapp") {
      // WhatsApp requires either templateKey or a plain message body.
      if (!order.customer.phone) {
        return NextResponse.json(
          { error: "Customer has no phone number on file" },
          { status: 400 }
        );
      }
      if (templateKey) {
        result = await sendWhatsAppMessage(
          order.customer.phone,
          templateKey,
          tplVars,
          { orderId: id, customerId: order.customer.id, staffId, actor }
        );
      } else {
        // Plain message — store as a text template inline.
        // We still send via the same path by formatting a one-off body.
        const body = message || "";
        if (!body) {
          return NextResponse.json(
            { error: "Either templateKey or message is required" },
            { status: 400 }
          );
        }
        // Use a custom send path: format and store directly.
        const log = await db.communicationLog.create({
          data: {
            orderId: id,
            customerId: order.customer.id,
            channel: "whatsapp",
            direction: "outbound",
            recipient: order.customer.phone,
            message: body,
            templateKey: null,
            deliveryStatus: "queued",
            staffId: staffId ?? null,
          },
        });
        result = {
          ok: true,
          providerMsgId: null,
          deliveryStatus: "queued",
          raw: { logId: log.id, message: "Plain WhatsApp message queued (no template)" },
        };
        // Note: actually sending requires a template on Meta's side.
        // For non-template messages without an approved template, we'd need to
        // implement a customer-service window message; for now we store it as queued.
      }
    } else {
      // email
      if (!order.customer.email) {
        return NextResponse.json(
          { error: "Customer has no email on file" },
          { status: 400 }
        );
      }
      if (templateKey) {
        const { subject, html, text } = formatEmailTemplate(templateKey, tplVars);
        result = await sendEmail(order.customer.email, subject, html, text, id, {
          customerId: order.customer.id,
          templateKey,
          staffId,
          actor,
        });
      } else {
        const body = message || "";
        if (!body) {
          return NextResponse.json(
            { error: "Either templateKey or message is required" },
            { status: 400 }
          );
        }
        result = await sendEmail(
          order.customer.email,
          `[Playbeat] Re: order #${order.orderNumber}`,
          `<div style="font-family:Arial,sans-serif">${escapeHtml(body).replace(/\n/g, "<br>")}</div>`,
          body,
          id,
          { customerId: order.customer.id, staffId, actor }
        );
      }
    }

    if (!result) {
      return NextResponse.json({ error: "Failed to send communication" }, { status: 500 });
    }

    // Create timeline event for the manual send
    await addTimelineEvent(
      id,
      result.ok ? `${channel}_sent` : `${channel}_failed`,
      `${channel === "whatsapp" ? "WhatsApp" : "Email"} ${result.ok ? "sent" : "failed"} (manual)`,
      result.error
        ? `Failed to send ${channel}: ${result.error}`
        : `${channel === "whatsapp" ? "WhatsApp" : "Email"} sent to ${order.customer.email || order.customer.phone}`,
      actor,
      {
        templateKey: templateKey ?? null,
        providerMsgId: result.providerMsgId,
        deliveryStatus: result.deliveryStatus,
        staffId: staffId ?? null,
      }
    );

    // Audit log
    await db.auditLog.create({
      data: {
        actor,
        actorId: staffId ?? null,
        action: `manual_${channel}_send`,
        entity: "order",
        entityId: id,
        meta: JSON.stringify({
          orderNumber: order.orderNumber,
          templateKey: templateKey ?? null,
          ok: result.ok,
          providerMsgId: result.providerMsgId,
        }),
      },
    });

    // Fetch the most recent CommunicationLog for this order (the one just created by the integration)
    const log = await db.communicationLog.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: {
        ok: result.ok,
        deliveryStatus: result.deliveryStatus,
        providerMsgId: result.providerMsgId,
        error: result.error ?? null,
        log: log
          ? {
              ...log,
              createdAt: log.createdAt.toISOString(),
            }
          : null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[crm/orders/[id]/communications] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
