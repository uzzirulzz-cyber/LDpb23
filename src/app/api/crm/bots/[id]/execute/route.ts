import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { completeOrder, processPaymentEvent } from "@/lib/payment-bot";
import { transitionOrder } from "@/lib/order-state";

type Params = { params: Promise<{ id: string }> };

// POST /api/crm/bots/[id]/execute
// Executes a bot's task queue. Real data only — no simulations.
//
// Bot roles (per schema):
//   - verification:   find orders with verificationStatus=pending, kick off verification flow
//   - checkout:       find orders in checkout_started/payment_submitted, ensure they advance
//   - notification:   send any queued notifications (manual trigger)
//   - ingestion | enrichment | dedup | routing | workflow | support: no-op stubs that record execution
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const bot = await db.bot.findUnique({ where: { id } });
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    if (!bot.enabled) {
      return NextResponse.json({ error: "Bot is disabled" }, { status: 400 });
    }

    // Mark bot busy + heartbeat
    await db.bot.update({
      where: { id },
      data: { status: "busy", currentJob: bot.role, lastHeartbeat: new Date() },
    });

    const startedAt = new Date();
    const execution = await db.botExecution.create({
      data: {
        botId: id,
        job: bot.role,
        status: "running",
        startedAt,
      },
    });

    let result: Record<string, unknown> = {};
    let errorMessage: string | null = null;

    try {
      switch (bot.role) {
        case "verification": {
          result = await runVerificationBot(id);
          break;
        }
        case "checkout": {
          result = await runCheckoutBot(id);
          break;
        }
        case "notification": {
          result = await runNotificationBot(id);
          break;
        }
        default: {
          // Generic bot — record execution only (no-op for ingestion/enrichment/etc.)
          result = { role: bot.role, processed: 0, message: "No automated task for this role." };
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error";
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await db.botExecution.update({
      where: { id: execution.id },
      data: {
        status: errorMessage ? "failed" : "success",
        durationMs,
        completedAt,
        result: JSON.stringify(result),
        error: errorMessage,
      },
    });

    // Update bot stats
    await db.bot.update({
      where: { id },
      data: {
        status: errorMessage ? "error" : "idle",
        currentJob: null,
        executions: { increment: 1 },
        successes: errorMessage ? 0 : { increment: 1 },
        failures: errorMessage ? { increment: 1 } : 0,
        latencyMs: durationMs,
        lastHeartbeat: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actor: `bot:${id}`,
        action: "bot_executed",
        entity: "bot",
        entityId: id,
        meta: JSON.stringify({
          role: bot.role,
          executionId: execution.id,
          durationMs,
          success: !errorMessage,
          error: errorMessage,
          summary: result,
        }),
      },
    });

    return NextResponse.json({
      data: {
        executionId: execution.id,
        botId: id,
        role: bot.role,
        status: errorMessage ? "failed" : "success",
        durationMs,
        result,
        error: errorMessage,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── VERIFICATION BOT ────────────────────────────────────────────
// Finds orders with verificationStatus=pending that have a paymentId
// but no AdminNotification yet, and ensures the verification flow was kicked off.
async function runVerificationBot(botId: string): Promise<Record<string, unknown>> {
  const pendingOrders = await db.order.findMany({
    where: {
      verificationStatus: "pending",
      paymentId: { not: null },
      status: "payment_verification",
    },
    take: 50,
    include: { customer: { select: { id: true, name: true, email: true, phone: true } } },
  });

  let processed = 0;
  let skipped = 0;
  const tasks: Array<{ orderId: string; status: string }> = [];

  for (const order of pendingOrders) {
    // Check if there's already an AdminNotification for this order
    const existingNotif = await db.adminNotification.findFirst({
      where: { orderId: order.id, type: "payment_verification_required" },
    });
    if (existingNotif) {
      skipped++;
      tasks.push({ orderId: order.id, status: "skipped_already_notified" });
      continue;
    }

    // Create a BotTask + re-fire processPaymentEvent (idempotent — it'll skip if already verified)
    await db.botTask.create({
      data: {
        botId,
        orderId: order.id,
        taskType: "verify_payment",
        status: "running",
        payload: JSON.stringify({ orderId: order.id, paymentId: order.paymentId }),
        startedAt: new Date(),
      },
    });

    await processPaymentEvent(order.id, {
      eventId: `bot_replay_${order.id}_${Date.now()}`,
      eventType: "transaction.completed",
      gatewayTxnRef: order.paymentId || "",
      merchantTransactionId: order.orderNumber,
      status: "SUCCESS",
      amount: order.total,
      currency: order.currency,
      occurredAt: new Date().toISOString(),
      raw: { source: "verification_bot_replay" },
    });

    await db.botTask.updateMany({
      where: { botId, orderId: order.id, status: "running" },
      data: { status: "completed", completedAt: new Date() },
    });

    processed++;
    tasks.push({ orderId: order.id, status: "processed" });
  }

  return { role: "verification", pending: pendingOrders.length, processed, skipped, tasks };
}

// ─── CHECKOUT BOT ────────────────────────────────────────────────
// Finds verified orders that haven't moved to processing and moves them.
async function runCheckoutBot(botId: string): Promise<Record<string, unknown>> {
  const verifiedOrders = await db.order.findMany({
    where: {
      status: "payment_verified",
      verificationStatus: "verified",
    },
    take: 50,
  });

  let processed = 0;
  let completed = 0;
  const tasks: Array<{ orderId: string; status: string }> = [];

  for (const order of verifiedOrders) {
    // Move to order_processing
    try {
      await transitionOrder(order.id, "order_processing", `bot:${botId}`, {
        paymentStatus: "verified",
      });
      await db.botTask.create({
        data: {
          botId,
          orderId: order.id,
          taskType: "process_order",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      processed++;
      tasks.push({ orderId: order.id, status: "moved_to_processing" });

      // For digital orders, auto-complete (license keys are already attached to items)
      // For physical, leave in processing for shipping team.
      const items = await db.orderItem.findMany({ where: { orderId: order.id } });
      const allDigital = items.every((it) => it.deliveryType === "Instant Auto-Email");
      if (allDigital && items.length > 0) {
        await completeOrder(order.id, { actor: `bot:${botId}` });
        completed++;
        tasks.push({ orderId: order.id, status: "auto_completed" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      tasks.push({ orderId: order.id, status: `error: ${msg}` });
    }
  }

  return { role: "checkout", verified: verifiedOrders.length, processed, completed, tasks };
}

// ─── NOTIFICATION BOT ────────────────────────────────────────────
// Sends/resends pending notifications (currently just records counts;
// WhatsApp/email sends are handled by the payment bot at trigger time).
async function runNotificationBot(botId: string): Promise<Record<string, unknown>> {
  const unread = await db.adminNotification.count({ where: { isRead: false } });
  const byType = await db.adminNotification.groupBy({
    by: ["type"],
    where: { isRead: false },
    _count: true,
  });

  return {
    role: "notification",
    unreadCount: unread,
    byType: byType.map((b) => ({ type: b.type, count: b._count })),
    message: "Notification bot does not auto-send — it surfaces unread counts for staff.",
  };
}
