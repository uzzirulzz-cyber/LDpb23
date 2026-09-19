// Playbeat.digital — Order state machine
// Single source of truth for order + payment state transitions.
// Every transition is validated, persisted, timeline-logged, and audit-logged.

import { db } from "@/lib/db";

// ─── STATE ENUMS ────────────────────────────────────────────────
export const ORDER_STATES = [
  "account_created",
  "checkout_started",
  "payment_pending",
  "payment_submitted",
  "payment_verification",
  "payment_verified",
  "order_processing",
  "order_completed",
  "payment_failed",
  "payment_rejected",
  "order_cancelled",
] as const;
export type OrderState = (typeof ORDER_STATES)[number];

export const PAYMENT_STATES = [
  "pending",
  "processing",
  "paid",
  "payment_failed",
  "payment_cancelled",
  "verification_required",
  "verified",
  "rejected",
  "refunded",
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

// ─── VALID TRANSITIONS ───────────────────────────────────────────
// Map of: from-state → set of to-states that are allowed.
export const VALID_TRANSITIONS: Record<string, string[]> = {
  account_created: ["checkout_started", "order_cancelled"],
  checkout_started: ["payment_pending", "payment_submitted", "order_cancelled"],
  payment_pending: ["payment_submitted", "payment_failed", "order_cancelled"],
  payment_submitted: ["payment_verification", "payment_failed", "order_cancelled"],
  payment_verification: ["payment_verified", "payment_rejected", "payment_failed", "order_cancelled"],
  payment_verified: ["order_processing", "order_cancelled"],
  order_processing: ["order_completed", "order_cancelled"],
  order_completed: [], // terminal
  payment_failed: ["payment_submitted", "order_cancelled"], // allow retry
  payment_rejected: ["payment_submitted", "order_cancelled"], // allow retry
  order_cancelled: [], // terminal
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true; // no-op allowed (idempotent re-saves)
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

// ─── TIMELINE HELPERS ────────────────────────────────────────────
export async function addTimelineEvent(
  orderId: string,
  eventType: string,
  title: string,
  description: string,
  actor: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await db.orderTimelineEvent.create({
    data: {
      orderId,
      eventType,
      title,
      description,
      actor,
      metadata: JSON.stringify(metadata),
    },
  });
}

// ─── STATE MACHINE TRANSITION ────────────────────────────────────
export interface TransitionOptions {
  paymentStatus?: string;
  verificationStatus?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validate + persist an order state transition.
 * - Throws on invalid transition (no silent corruption).
 * - Updates Order.status (+ optional paymentStatus / verificationStatus).
 * - Creates an OrderTimelineEvent describing the change.
 * - Writes an AuditLog entry.
 *
 * `actor` must be one of: "system" | "bot:{id}" | "staff:{id}" | "customer:{id}".
 */
export async function transitionOrder(
  orderId: string,
  newStatus: string,
  actor: string,
  options: TransitionOptions = {}
): Promise<{ id: string; orderNumber: string; status: string; paymentStatus: string }> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!ORDER_STATES.includes(newStatus as OrderState)) {
    throw new Error(`Invalid order state: ${newStatus}`);
  }

  if (!canTransition(order.status, newStatus)) {
    throw new Error(
      `Invalid transition: ${order.status} → ${newStatus} (order ${order.orderNumber})`
    );
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (options.paymentStatus) {
    if (!PAYMENT_STATES.includes(options.paymentStatus as PaymentState)) {
      throw new Error(`Invalid payment state: ${options.paymentStatus}`);
    }
    updateData.paymentStatus = options.paymentStatus;
  }
  if (options.verificationStatus) {
    updateData.verificationStatus = options.verificationStatus;
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: updateData,
    select: { id: true, orderNumber: true, status: true, paymentStatus: true },
  });

  // Timeline event
  await addTimelineEvent(
    orderId,
    "status_changed",
    `Status → ${newStatus}`,
    `Order ${order.orderNumber} moved from ${order.status} to ${newStatus}.`,
    actor,
    {
      from: order.status,
      to: newStatus,
      paymentStatus: options.paymentStatus ?? null,
      verificationStatus: options.verificationStatus ?? null,
      ...options.metadata,
    }
  );

  // Audit log
  await db.auditLog.create({
    data: {
      actor,
      actorId: actor.startsWith("staff:") ? actor.slice(6) : null,
      action: "order_state_transition",
      entity: "order",
      entityId: orderId,
      meta: JSON.stringify({
        orderNumber: order.orderNumber,
        from: order.status,
        to: newStatus,
        paymentStatus: options.paymentStatus ?? null,
        verificationStatus: options.verificationStatus ?? null,
      }),
    },
  });

  return updated;
}
