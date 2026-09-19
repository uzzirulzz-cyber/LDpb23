import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  type WebhookPayload,
} from "@/lib/rapid-gateway";
import { processPaymentEvent } from "@/lib/payment-bot";
import { transitionOrder, addTimelineEvent } from "@/lib/order-state";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmailTemplate } from "@/lib/email";

// POST /webhooks/rapid-gateway
// Rapid Gateway sends signed webhooks here for payment events.
// We verify the HMAC-SHA256 signature, then hand off to the payment bot.
//
// Events:
//   transaction.completed → bot.processPaymentEvent (sets verification_required + notifies Super Admin)
//   transaction.failed    → mark payment failed + notify customer
//   refund.completed      → mark refunded
//   webhook.test          → acknowledge (portal test-fire)
//
// CRITICAL: The webhook NEVER auto-verifies payments. The bot escalates to a Super Admin.

export async function POST(req: NextRequest) {
  // Get the raw body bytes for signature verification.
  const rawBody = await req.text();

  const timestamp = req.headers.get("x-rapidgateway-timestamp") || "";
  const signature = req.headers.get("x-rapidgateway-signature") || "";
  const headerEventId = req.headers.get("x-rapidgateway-delivery") || "";

  // 1. Verify signature
  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    console.error("[rapid-gateway/webhook] Signature verification failed", {
      headerEventId,
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
  const payload = parseWebhookPayload(rawBody);
  if (!payload) {
    console.error("[rapid-gateway/webhook] Failed to parse payload", { headerEventId });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  console.log(`[rapid-gateway/webhook] Received ${payload.eventType}`, {
    eventId: payload.eventId,
    orderRef: payload.merchantTransactionId,
    status: payload.status,
    amount: payload.amount,
    currency: payload.currency,
  });

  // 3. Ignore test events
  if (payload.eventType === "webhook.test") {
    return NextResponse.json({ ok: true, message: "test event acknowledged" });
  }

  // 4. Idempotency — check AuditLog for this eventId
  const existingLog = await db.auditLog.findFirst({
    where: {
      action: "rapid_gateway_webhook",
      entityId: payload.eventId,
    },
  });
  if (existingLog) {
    console.log(`[rapid-gateway/webhook] Duplicate event ${payload.eventId} — ignoring`);
    return NextResponse.json({ ok: true, message: "duplicate event ignored" });
  }

  // 5. Find the order
  const order = await db.order.findUnique({
    where: { orderNumber: payload.merchantTransactionId },
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  if (!order) {
    console.warn(`[rapid-gateway/webhook] Order not found: ${payload.merchantTransactionId}`);
    await db.auditLog.create({
      data: {
        actor: "rapid-gateway",
        action: "rapid_gateway_webhook",
        entity: "order",
        entityId: payload.eventId,
        meta: JSON.stringify({ ...payload, error: "order not found" }),
      },
    });
    return NextResponse.json({ ok: true, message: "order not found (logged)" });
  }

  // 6. Log the webhook event (for idempotency + audit)
  await db.auditLog.create({
    data: {
      actor: "rapid-gateway",
      action: "rapid_gateway_webhook",
      entity: "order",
      entityId: payload.eventId,
      meta: JSON.stringify({
        orderNumber: order.orderNumber,
        orderId: order.id,
        eventType: payload.eventType,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        gatewayTxnRef: payload.gatewayTxnRef,
        occurredAt: payload.occurredAt,
      }),
    },
  });

  // 7. Dispatch based on event type
  try {
    if (payload.eventType === "transaction.completed" && payload.status === "SUCCESS") {
      // Hand off to payment bot — it sets verification_required + notifies Super Admin.
      // It NEVER auto-verifies.
      await processPaymentEvent(order.id, {
        eventId: payload.eventId,
        eventType: payload.eventType,
        gatewayTxnRef: payload.gatewayTxnRef,
        merchantTransactionId: payload.merchantTransactionId,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        occurredAt: payload.occurredAt,
        raw: payload,
      });

      // Analytics event
      await db.analyticsEvent.create({
        data: {
          type: "payment_received",
          entity: "order",
          entityId: order.id,
          value: order.total,
          currency: order.currency,
          source: "rapid-gateway",
          meta: JSON.stringify({
            orderNumber: order.orderNumber,
            gatewayTxnRef: payload.gatewayTxnRef,
            amount: payload.amount,
            currency: payload.currency,
          }),
        },
      });

      // Fire Meta Pixel Purchase event (best-effort)
      try {
        await fetch(
          `${process.env.RAPID_GATEWAY_BASE_URL || ""}/api/pixel/track`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventName: "Purchase",
              value: order.total,
              currency: order.currency,
              eventId: `purchase_${order.id}`,
            }),
          }
        );
      } catch {
        // best-effort
      }

      console.log(
        `[rapid-gateway/webhook] Order ${order.orderNumber} handed to payment bot for verification`
      );
    } else if (payload.eventType === "transaction.failed") {
      // Payment failed — mark order, notify customer.
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "payment_failed",
          paymentStatus: "payment_failed",
          paymentId: payload.gatewayTxnRef,
        },
      });

      await addTimelineEvent(
        order.id,
        "payment_failed",
        "Payment Failed",
        `Rapid Gateway reported payment failure for order ${order.orderNumber}. Gateway ref: ${payload.gatewayTxnRef}`,
        "rapid-gateway",
        { gatewayTxnRef: payload.gatewayTxnRef, eventId: payload.eventId }
      );

      // Notify customer via WhatsApp + email
      const waVariables = {
        customer_name: order.customer.name,
        order_id: order.orderNumber,
        amount: String(order.total),
        currency: order.currency,
        reason: payload.status || "Payment failed at gateway",
      };
      if (order.customer.phone) {
        try {
          await sendWhatsAppMessage(order.customer.phone, "payment_failed", waVariables, {
            orderId: order.id,
            customerId: order.customer.id,
            botId: "payment-failed",
            actor: "rapid-gateway",
          });
        } catch (err) {
          console.error("[rapid-gateway/webhook] WhatsApp failure-notify error:", err);
        }
      }
      try {
        await sendEmailTemplate(order.customer.email, "payment_failed", waVariables, {
          orderId: order.id,
          customerId: order.customer.id,
          botId: "payment-failed",
          actor: "rapid-gateway",
        });
      } catch (err) {
        console.error("[rapid-gateway/webhook] Email failure-notify error:", err);
      }

      // AdminNotification
      await db.adminNotification.create({
        data: {
          orderId: order.id,
          type: "payment_failed",
          title: "Payment Failed",
          message: `Payment for order ${order.orderNumber} failed at the gateway. Customer: ${order.customer.email}`,
          metadata: JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            gatewayTxnRef: payload.gatewayTxnRef,
            status: payload.status,
          }),
          isRead: false,
        },
      });

      console.log(`[rapid-gateway/webhook] Order ${order.orderNumber} marked FAILED`);
    } else if (payload.eventType === "refund.completed") {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "order_cancelled",
          paymentStatus: "refunded",
        },
      });
      await addTimelineEvent(
        order.id,
        "status_changed",
        "Refund Completed",
        `Refund processed for order ${order.orderNumber}. Gateway ref: ${payload.gatewayTxnRef}`,
        "rapid-gateway",
        { gatewayTxnRef: payload.gatewayTxnRef, eventId: payload.eventId }
      );
      console.log(`[rapid-gateway/webhook] Order ${order.orderNumber} marked REFUNDED`);
    } else {
      console.log(`[rapid-gateway/webhook] Unhandled event ${payload.eventType}/${payload.status} — logged only`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      `[rapid-gateway/webhook] Processing error for ${payload.eventId}:`,
      err
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}

// GET for Vercel health checks
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "rapid-gateway-webhook",
    timestamp: new Date().toISOString(),
  });
}
