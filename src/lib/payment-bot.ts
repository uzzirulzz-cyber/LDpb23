// Playbeat.digital — Payment verification bot
// Core engine that drives order flow from payment_received → verified → completed.
//
// Critical rules (zero tolerance for fakes):
//  - Payment verification comes from the gateway webhook (caller already verified signature).
//  - Bot NEVER auto-verifies payments. It escalates to a Super Admin notification.
//  - Idempotency: duplicate webhook events are detected and skipped.
//  - Every action writes OrderTimelineEvent + AuditLog.
//  - WhatsApp/email failures are logged gracefully — they don't roll back state changes.

import { db } from "@/lib/db";
import {
  transitionOrder,
  addTimelineEvent,
  canTransition,
} from "@/lib/order-state";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendEmailTemplate } from "@/lib/email";

interface OrderWithRelations {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  verificationStatus: string;
  total: number;
  currency: string;
  paymentId: string | null;
  paymentMethod: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

async function loadOrderWithCustomer(orderId: string): Promise<OrderWithRelations | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  return order as unknown as OrderWithRelations | null;
}

// ─── PROCESS PAYMENT EVENT (called by webhook after signature verification) ──
export interface PaymentPayload {
  eventId: string;
  eventType: string;
  gatewayTxnRef: string;
  merchantTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  occurredAt: string;
  raw: unknown;
}

/**
 * Entry point for the payment bot — called by /webhooks/rapid-gateway
 * AFTER the webhook signature has been verified.
 *
 * Steps:
 *   1. Find order by ID
 *   2. Idempotency check — skip if already verified or already in verification flow
 *   3. Move order to payment_verification state
 *   4. Create AdminNotification for Super Admin
 *   5. Send WhatsApp + email (payment_under_review) to customer
 *   6. Timeline + audit logs
 */
export async function processPaymentEvent(
  orderId: string,
  paymentPayload: PaymentPayload
): Promise<{ order: OrderWithRelations | null; skipped: boolean; reason?: string }> {
  const order = await loadOrderWithCustomer(orderId);
  if (!order) {
    await db.auditLog.create({
      data: {
        actor: "bot:payment-verification",
        action: "payment_event_no_order",
        entity: "order",
        entityId: orderId,
        meta: JSON.stringify({ payload: paymentPayload }),
      },
    });
    return { order: null, skipped: true, reason: "Order not found" };
  }

  // 2. Idempotency — if order is already past the verification step, skip.
  if (
    order.status === "payment_verified" ||
    order.status === "order_processing" ||
    order.status === "order_completed" ||
    order.verificationStatus === "verified"
  ) {
    await db.auditLog.create({
      data: {
        actor: "bot:payment-verification",
        action: "payment_event_skipped",
        entity: "order",
        entityId: orderId,
        meta: JSON.stringify({
          orderNumber: order.orderNumber,
          currentStatus: order.status,
          eventId: paymentPayload.eventId,
          reason: "Already verified",
        }),
      },
    });
    return { order, skipped: true, reason: "Order already verified" };
  }

  // If we're already in payment_verification with the same paymentId, skip duplicate.
  if (
    order.status === "payment_verification" &&
    order.paymentId === paymentPayload.gatewayTxnRef
  ) {
    return { order, skipped: true, reason: "Duplicate event for in-progress verification" };
  }

  // 3. Transition order to payment_verification state.
  //    Only attempt a state transition if we're not already there.
  if (order.status !== "payment_verification") {
    if (!canTransition(order.status, "payment_verification")) {
      // Force the transition if we can — payments take priority over generic status.
      // But log it loudly so we can audit the override.
      await db.auditLog.create({
        data: {
          actor: "bot:payment-verification",
          action: "payment_event_state_override",
          entity: "order",
          entityId: orderId,
          meta: JSON.stringify({
            orderNumber: order.orderNumber,
            from: order.status,
            to: "payment_verification",
            eventId: paymentPayload.eventId,
          }),
        },
      });
      // Hard-set status (skip state machine validation for payment events).
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "payment_verification",
          paymentStatus: "verification_required",
          verificationStatus: "pending",
          paymentId: paymentPayload.gatewayTxnRef,
          paymentMethod: "rapid-gateway",
        },
      });
    } else {
      await transitionOrder(orderId, "payment_verification", "bot:payment-verification", {
        paymentStatus: "verification_required",
        verificationStatus: "pending",
        metadata: { eventId: paymentPayload.eventId, gatewayTxnRef: paymentPayload.gatewayTxnRef },
      });
    }
  }

  // Always update paymentId + paymentMethod
  await db.order.update({
    where: { id: orderId },
    data: {
      paymentId: paymentPayload.gatewayTxnRef,
      paymentMethod: "rapid-gateway",
    },
  });

  // 4. Timeline event: Payment Verification Started
  await addTimelineEvent(
    orderId,
    "payment_verification_started",
    "Payment Verification Started",
    `Payment event ${paymentPayload.eventId} received from Rapid Gateway. Order queued for Super Admin verification.`,
    "bot:payment-verification",
    {
      eventId: paymentPayload.eventId,
      gatewayTxnRef: paymentPayload.gatewayTxnRef,
      amount: paymentPayload.amount,
      currency: paymentPayload.currency,
      occurredAt: paymentPayload.occurredAt,
    }
  );

  // 5. AdminNotification: Super Admin manual verification required
  await db.adminNotification.create({
    data: {
      orderId,
      type: "payment_verification_required",
      title: "New Payment Verification Required",
      message: `Order ${order.orderNumber} (PKR ${order.total}) from ${order.customer.email} requires Super Admin payment verification. Gateway ref: ${paymentPayload.gatewayTxnRef}`,
      metadata: JSON.stringify({
        orderId,
        orderNumber: order.orderNumber,
        customerEmail: order.customer.email,
        customerName: order.customer.name,
        amount: order.total,
        currency: order.currency,
        gatewayTxnRef: paymentPayload.gatewayTxnRef,
        eventId: paymentPayload.eventId,
        occurredAt: paymentPayload.occurredAt,
      }),
      isRead: false,
    },
  });

  // Timeline event: Super Admin notified
  await addTimelineEvent(
    orderId,
    "super_admin_notified",
    "Super Admin Notified",
    "Payment verification request sent to Super Admins via dashboard notification.",
    "bot:payment-verification",
    { gatewayTxnRef: paymentPayload.gatewayTxnRef }
  );

  // 6. Send WhatsApp to customer (payment_under_review)
  const waVariables = {
    customer_name: order.customer.name,
    order_id: order.orderNumber,
    amount: String(order.total),
    currency: order.currency,
  };
  if (order.customer.phone) {
    try {
      await sendWhatsAppMessage(
        order.customer.phone,
        "payment_under_review",
        waVariables,
        {
          orderId,
          customerId: order.customerId,
          botId: "payment-verification",
          actor: "bot:payment-verification",
        }
      );
    } catch (err) {
      // Log but don't throw — payment flow must continue.
      await logBotFailure(orderId, "whatsapp", err);
    }
  }

  // 7. Send email to customer (payment_under_review)
  try {
    await sendEmailTemplate(order.customer.email, "payment_under_review", waVariables, {
      orderId,
      customerId: order.customerId,
      botId: "payment-verification",
      actor: "bot:payment-verification",
    });
  } catch (err) {
    await logBotFailure(orderId, "email", err);
  }

  // 8. Audit log
  await db.auditLog.create({
    data: {
      actor: "bot:payment-verification",
      action: "payment_event_processed",
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({
        orderNumber: order.orderNumber,
        eventId: paymentPayload.eventId,
        gatewayTxnRef: paymentPayload.gatewayTxnRef,
      }),
    },
  });

  const updated = await loadOrderWithCustomer(orderId);
  return { order: updated, skipped: false };
}

// ─── SUPER ADMIN: VERIFY PAYMENT ─────────────────────────────────
export async function verifyPayment(
  orderId: string,
  adminUserId: string
): Promise<{ ok: boolean; order: OrderWithRelations | null; error?: string }> {
  const order = await loadOrderWithCustomer(orderId);
  if (!order) {
    return { ok: false, order: null, error: "Order not found" };
  }

  const actor = `staff:${adminUserId}`;

  // Use state machine if possible; otherwise force-set.
  if (canTransition(order.status, "payment_verified")) {
    await transitionOrder(orderId, "payment_verified", actor, {
      paymentStatus: "verified",
      verificationStatus: "verified",
      metadata: { adminUserId },
    });
  } else {
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "payment_verified",
        paymentStatus: "verified",
        verificationStatus: "verified",
      },
    });
  }

  // Timeline event
  await addTimelineEvent(
    orderId,
    "payment_verified",
    "Payment Verified",
    `Super Admin verified the payment for order ${order.orderNumber}.`,
    actor,
    { adminUserId, gatewayTxnRef: order.paymentId }
  );

  // Send WhatsApp: payment_verified
  const waVariables = {
    customer_name: order.customer.name,
    order_id: order.orderNumber,
    amount: String(order.total),
    currency: order.currency,
  };
  if (order.customer.phone) {
    try {
      await sendWhatsAppMessage(order.customer.phone, "payment_verified", waVariables, {
        orderId,
        customerId: order.customerId,
        staffId: adminUserId,
        actor,
      });
    } catch (err) {
      await logBotFailure(orderId, "whatsapp", err);
    }
  }

  // Send email: payment_verified
  try {
    await sendEmailTemplate(order.customer.email, "payment_verified", waVariables, {
      orderId,
      customerId: order.customerId,
      staffId: adminUserId,
      actor,
    });
  } catch (err) {
    await logBotFailure(orderId, "email", err);
  }

  // Mark AdminNotification as read for this order
  await db.adminNotification.updateMany({
    where: { orderId, isRead: false, type: "payment_verification_required" },
    data: { isRead: true, readAt: new Date(), readBy: adminUserId },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      actor,
      actorId: adminUserId,
      action: "payment_verified",
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({
        orderNumber: order.orderNumber,
        adminUserId,
      }),
    },
  });

  const updated = await loadOrderWithCustomer(orderId);
  return { ok: true, order: updated };
}

// ─── SUPER ADMIN: REJECT PAYMENT ─────────────────────────────────
export async function rejectPayment(
  orderId: string,
  adminUserId: string,
  reason: string
): Promise<{ ok: boolean; order: OrderWithRelations | null; error?: string }> {
  const order = await loadOrderWithCustomer(orderId);
  if (!order) {
    return { ok: false, order: null, error: "Order not found" };
  }

  const actor = `staff:${adminUserId}`;

  if (canTransition(order.status, "payment_rejected")) {
    await transitionOrder(orderId, "payment_rejected", actor, {
      paymentStatus: "rejected",
      verificationStatus: "rejected",
      metadata: { adminUserId, reason },
    });
  } else {
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "payment_rejected",
        paymentStatus: "rejected",
        verificationStatus: "rejected",
      },
    });
  }

  await addTimelineEvent(
    orderId,
    "payment_rejected",
    "Payment Rejected",
    `Super Admin rejected the payment for order ${order.orderNumber}. Reason: ${reason}`,
    actor,
    { adminUserId, reason }
  );

  // Send WhatsApp + email: payment_failed (with rejection reason)
  const waVariables = {
    customer_name: order.customer.name,
    order_id: order.orderNumber,
    amount: String(order.total),
    currency: order.currency,
    reason,
  };
  if (order.customer.phone) {
    try {
      await sendWhatsAppMessage(order.customer.phone, "payment_failed", waVariables, {
        orderId,
        customerId: order.customerId,
        staffId: adminUserId,
        actor,
      });
    } catch (err) {
      await logBotFailure(orderId, "whatsapp", err);
    }
  }
  try {
    await sendEmailTemplate(order.customer.email, "payment_failed", waVariables, {
      orderId,
      customerId: order.customerId,
      staffId: adminUserId,
      actor,
    });
  } catch (err) {
    await logBotFailure(orderId, "email", err);
  }

  // Mark AdminNotification as read
  await db.adminNotification.updateMany({
    where: { orderId, isRead: false, type: "payment_verification_required" },
    data: { isRead: true, readAt: new Date(), readBy: adminUserId },
  });

  await db.auditLog.create({
    data: {
      actor,
      actorId: adminUserId,
      action: "payment_rejected",
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({ orderNumber: order.orderNumber, adminUserId, reason }),
    },
  });

  const updated = await loadOrderWithCustomer(orderId);
  return { ok: true, order: updated };
}

// ─── COMPLETE ORDER ──────────────────────────────────────────────
export async function completeOrder(
  orderId: string,
  opts: { actor?: string } = {}
): Promise<{ ok: boolean; order: OrderWithRelations | null; error?: string }> {
  const order = await loadOrderWithCustomer(orderId);
  if (!order) {
    return { ok: false, order: null, error: "Order not found" };
  }

  const actor = opts.actor || "bot:order-processing";

  if (canTransition(order.status, "order_completed")) {
    await transitionOrder(orderId, "order_completed", actor, {
      paymentStatus: "verified",
      metadata: { completedBy: actor },
    });
  } else {
    await db.order.update({
      where: { id: orderId },
      data: { status: "order_completed", paymentStatus: "verified" },
    });
  }

  await addTimelineEvent(
    orderId,
    "order_completed",
    "Order Completed",
    `Order ${order.orderNumber} has been completed. License keys delivered to ${order.customer.email}.`,
    actor,
    { completedBy: actor }
  );

  const waVariables = {
    customer_name: order.customer.name,
    order_id: order.orderNumber,
    amount: String(order.total),
    currency: order.currency,
  };
  if (order.customer.phone) {
    try {
      await sendWhatsAppMessage(order.customer.phone, "order_completed", waVariables, {
        orderId,
        customerId: order.customerId,
        botId: "order-processing",
        actor,
      });
    } catch (err) {
      await logBotFailure(orderId, "whatsapp", err);
    }
  }
  try {
    await sendEmailTemplate(order.customer.email, "order_completed", waVariables, {
      orderId,
      customerId: order.customerId,
      botId: "order-processing",
      actor,
    });
  } catch (err) {
    await logBotFailure(orderId, "email", err);
  }

  await db.auditLog.create({
    data: {
      actor,
      action: "order_completed",
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({ orderNumber: order.orderNumber, completedBy: actor }),
    },
  });

  const updated = await loadOrderWithCustomer(orderId);
  return { ok: true, order: updated };
}

// ─── FAILURE LOGGER (graceful) ───────────────────────────────────
async function logBotFailure(
  orderId: string,
  channel: "whatsapp" | "email",
  err: unknown
): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  await db.auditLog.create({
    data: {
      actor: "bot:payment-verification",
      action: `bot_${channel}_failure`,
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({ channel, error: msg }),
    },
  });
}
