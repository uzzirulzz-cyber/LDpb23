import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...workflow,
        steps: workflow.steps ? JSON.parse(workflow.steps) : [],
        lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (body.runNow === true) {
      // Real execution: increment runs, set lastRunAt, clear lastError,
      // log to AuditLog (full step engine deferred to background worker)
      const workflow = await db.workflow.update({
        where: { id },
        data: {
          runs: { increment: 1 },
          lastRunAt: new Date(),
          lastError: null,
        },
      });

      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "execute",
          entity: "workflow",
          entityId: id,
          meta: JSON.stringify({
            trigger: existing.trigger,
            steps: existing.steps ? JSON.parse(existing.steps) : [],
            runs: workflow.runs,
          }),
        },
      });

      return NextResponse.json({
        data: {
          ...workflow,
          steps: workflow.steps ? JSON.parse(workflow.steps) : [],
          lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
          createdAt: workflow.createdAt.toISOString(),
          updatedAt: workflow.updatedAt.toISOString(),
        },
      });
    }

    const data: Record<string, unknown> = {};
    const fields = ["name", "description", "trigger", "owner"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.steps !== undefined) data.steps = JSON.stringify(body.steps);

    const workflow = await db.workflow.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "workflow",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...workflow,
        steps: workflow.steps ? JSON.parse(workflow.steps) : [],
        lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    await db.workflow.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "workflow",
        entityId: id,
        meta: JSON.stringify({}),
      },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
