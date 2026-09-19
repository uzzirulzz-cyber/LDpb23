import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const rule = await db.rule.findUnique({ where: { id } });
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...rule,
        conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
        actions: rule.actions ? JSON.parse(rule.actions) : [],
        lastRunAt: rule.lastRunAt?.toISOString() ?? null,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
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

    const existing = await db.rule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    if (body.runNow === true) {
      const rule = await db.rule.update({
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
          entity: "rule",
          entityId: id,
          meta: JSON.stringify({
            trigger: existing.trigger,
            conditions: existing.conditions ? JSON.parse(existing.conditions) : [],
            actions: existing.actions ? JSON.parse(existing.actions) : [],
          }),
        },
      });

      return NextResponse.json({
        data: {
          ...rule,
          conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
          actions: rule.actions ? JSON.parse(rule.actions) : [],
          lastRunAt: rule.lastRunAt?.toISOString() ?? null,
          createdAt: rule.createdAt.toISOString(),
          updatedAt: rule.updatedAt.toISOString(),
        },
      });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.trigger !== undefined) data.trigger = body.trigger;
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.conditions !== undefined) data.conditions = JSON.stringify(body.conditions);
    if (body.actions !== undefined) data.actions = JSON.stringify(body.actions);

    const rule = await db.rule.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "rule",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...rule,
        conditions: rule.conditions ? JSON.parse(rule.conditions) : [],
        actions: rule.actions ? JSON.parse(rule.actions) : [],
        lastRunAt: rule.lastRunAt?.toISOString() ?? null,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
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

    await db.rule.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "rule",
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
