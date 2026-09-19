import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  type WebhookPayload,
} from "@/lib/rapid-gateway";

// POST /webhooks/rapid-gateway
// Rapid Gateway sends signed webhooks here for payment events.
// We verify the HMAC-SHA256 signature, then update the order.
//
// Events:
//   transaction.completed → mark order paid, generate license keys, fire analytics
//   transaction.failed → mark order as failed
//   refund.completed → mark order as refunded
//   webhook.test → acknowledge but ignore (portal test-fire)

export async function POST(req: NextRequest) {
  // CRITICAL: get the raw body bytes for signature verification.
  // Do NOT use req.json() — re-serializing JSON breaks the signature.
  const rawBody = await req.text();

  const timestamp = req.headers.get("x-rapidgateway-timestamp") || "";
  const signature = req.headers.get("x-rapidgateway-signature") || "";
  const eventType = req.headers.get("x-rapidgateway-event") || "";
  const eventId = req.headers.get("x-rapidgateway-delivery") || "";

  // 1. Verify signature (or reject)
  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    console.error("[rapid-gateway/webhook] Signature verification failed", {
      eventType,
      eventId,
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse payload
  const payload = parseWebhookPayload(rawBody);
  if (!payload) {
    console.error("[rapid-gateway/webhook] Failed to parse payload", { eventId });
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

  // 4. De-duplicate on eventId (idempotency)
  // Check if we already processed this event
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

  // 5. Process the event
  try {
    await processWebhookEvent(payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[rapid-gateway/webhook] Processing error for ${payload.eventId}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}

async function processWebhookEvent(payload: WebhookPayload) {
  const orderNumber = payload.merchantTransactionId;

  // Find the order by orderNumber
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) {
    console.warn(`[rapid-gateway/webhook] Order not found: ${orderNumber}`);
    // Still log the webhook for audit
    await db.auditLog.create({
      data: {
        actor: "rapid-gateway",
        action: "rapid_gateway_webhook",
        entity: "order",
        entityId: payload.eventId,
        meta: JSON.stringify({ ...payload, error: "order not found" }),
      },
    });
    return;
  }

  // Log the webhook event (for idempotency + audit)
  await db.auditLog.create({
    data: {
      actor: "rapid-gateway",
      action: "rapid_gateway_webhook",
      entity: "order",
      entityId: payload.eventId,
      meta: JSON.stringify({
        orderNumber,
        eventType: payload.eventType,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        gatewayTxnRef: payload.gatewayTxnRef,
        occurredAt: payload.occurredAt,
      }),
    },
  });

  if (payload.eventType === "transaction.completed" && payload.status === "SUCCESS") {
    // Payment succeeded — mark order as paid
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paymentStatus: "paid",
        paymentId: payload.gatewayTxnRef,
        paymentMethod: "rapid-gateway",
      },
    });

    // Create analytics event
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

    // Decrement stock for physical products (only on successful payment)
    for (const item of order.items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (product && !product.digital) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await db.inventoryItem.updateMany({
          where: { productId: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Fire Meta Pixel Purchase event (best-effort)
    try {
      await fetch(`${process.env.RAPID_GATEWAY_BASE_URL || ""}/api/pixel/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Purchase",
          value: order.total,
          currency: order.currency,
          eventId: `purchase_${order.id}`,
        }),
      });
    } catch {
      // best-effort
    }

    console.log(`[rapid-gateway/webhook] Order ${orderNumber} marked PAID`);
  } else if (payload.eventType === "transaction.failed") {
    // Payment failed — mark order
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "cancelled",
        paymentStatus: "failed",
        paymentId: payload.gatewayTxnRef,
      },
    });
    console.log(`[rapid-gateway/webhook] Order ${orderNumber} marked FAILED`);
  } else if (payload.eventType === "refund.completed") {
    // Refund completed
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        paymentStatus: "refunded",
      },
    });
    console.log(`[rapid-gateway/webhook] Order ${orderNumber} marked REFUNDED`);
  }
}

// Also handle GET for Vercel health checks
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "rapid-gateway-webhook",
    timestamp: new Date().toISOString(),
  });
}
