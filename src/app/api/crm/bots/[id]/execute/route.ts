import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const bot = await db.bot.findUnique({ where: { id } });
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const startedAt = new Date();
    const job = bot.role;
    const startMs = startedAt.getTime();

    // 1. Create execution record as running
    const execution = await db.botExecution.create({
      data: {
        botId: bot.id,
        job,
        status: "running",
      },
    });

    // 2. Mark bot busy
    await db.bot.update({
      where: { id: bot.id },
      data: {
        status: "busy",
        currentJob: job,
        lastHeartbeat: new Date(),
      },
    });

    // 3. Do the actual job based on role — real queries, no fabricated numbers
    let found = 0;
    let result: Record<string, unknown> = { role: bot.role };

    if (bot.role === "ingestion") {
      // Count leads with no ingestion timestamp (never been ingested by an API)
      const pending = await db.lead.count({
        where: { ingestionTimestamp: null },
      });
      found = pending;
      result.pendingIngestion = pending;
    } else if (bot.role === "dedup") {
      // Count duplicate emails (emails that appear more than once)
      const leadsWithEmail = await db.lead.findMany({
        where: { email: { not: null } },
        select: { email: true },
      });
      const counts = new Map<string, number>();
      for (const l of leadsWithEmail) {
        if (!l.email) continue;
        counts.set(l.email, (counts.get(l.email) ?? 0) + 1);
      }
      let dupes = 0;
      counts.forEach((n) => {
        if (n > 1) dupes += n - 1;
      });
      found = dupes;
      result.duplicateLeads = dupes;
    } else if (bot.role === "verification") {
      // Count unverified leads
      const unverified = await db.lead.count({
        where: { verificationStatus: "unverified" },
      });
      found = unverified;
      result.unverifiedLeads = unverified;
    } else if (bot.role === "enrichment") {
      // Count leads not yet enriched
      const notEnriched = await db.lead.count({
        where: { enrichedAt: null },
      });
      found = notEnriched;
      result.unenrichedLeads = notEnriched;
    } else if (bot.role === "routing") {
      // Count unassigned leads
      const unassigned = await db.lead.count({
        where: { assignedTo: null, archivedAt: null },
      });
      found = unassigned;
      result.unassignedLeads = unassigned;
    } else if (bot.role === "support") {
      // Count open inbox threads
      const open = await db.inboxThread.count({
        where: { status: "open" },
      });
      found = open;
      result.openThreads = open;
    } else if (bot.role === "notification") {
      // Count pending workflow runs (workflows enabled but never run)
      const stale = await db.workflow.count({
        where: { enabled: true, lastRunAt: null },
      });
      found = stale;
      result.staleWorkflows = stale;
    } else if (bot.role === "checkout") {
      // Count pending orders
      const pendingOrders = await db.order.count({
        where: { status: "pending" },
      });
      found = pendingOrders;
      result.pendingOrders = pendingOrders;
    } else if (bot.role === "workflow") {
      // Count enabled workflows with errors
      const errored = await db.workflow.count({
        where: { enabled: true, lastError: { not: null } },
      });
      found = errored;
      result.erroredWorkflows = errored;
    } else {
      result.note = "No specific job defined for role";
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startMs;

    // 4. Update execution as success
    const updatedExecution = await db.botExecution.update({
      where: { id: execution.id },
      data: {
        status: "success",
        durationMs,
        result: JSON.stringify({ ...result, found }),
        completedAt,
      },
    });

    // 5. Update bot metrics — back to idle
    const updatedBot = await db.bot.update({
      where: { id: bot.id },
      data: {
        status: "idle",
        currentJob: null,
        executions: { increment: 1 },
        successes: { increment: 1 },
        latencyMs: durationMs,
        lastHeartbeat: new Date(),
      },
    });

    // 6. AuditLog entry
    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "execute",
        entity: "bot",
        entityId: bot.id,
        meta: JSON.stringify({
          executionId: updatedExecution.id,
          job,
          found,
          durationMs,
          result,
        }),
      },
    });

    return NextResponse.json({
      data: {
        ...updatedExecution,
        result: JSON.parse(updatedExecution.result),
        startedAt: updatedExecution.startedAt.toISOString(),
        completedAt: updatedExecution.completedAt?.toISOString() ?? null,
        bot: {
          ...updatedBot,
          lastHeartbeat: updatedBot.lastHeartbeat?.toISOString() ?? null,
          createdAt: updatedBot.createdAt.toISOString(),
          updatedAt: updatedBot.updatedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // On failure, mark bot as error
    try {
      const { id } = await params;
      await db.bot.update({
        where: { id },
        data: { status: "error", currentJob: null, lastHeartbeat: new Date() },
      });
    } catch {
      // ignore
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
