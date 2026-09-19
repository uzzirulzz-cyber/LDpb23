import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rules = await db.rule.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = rules.map((r) => ({
      ...r,
      conditions: r.conditions ? JSON.parse(r.conditions) : [],
      actions: r.actions ? JSON.parse(r.actions) : [],
      lastRunAt: r.lastRunAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const rule = await db.rule.create({
      data: {
        name: body.name,
        trigger: body.trigger,
        conditions: body.conditions ? JSON.stringify(body.conditions) : "[]",
        actions: body.actions ? JSON.stringify(body.actions) : "[]",
        enabled: body.enabled ?? false,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "rule",
        entityId: rule.id,
        meta: JSON.stringify({ name: rule.name }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...rule,
          conditions: JSON.parse(rule.conditions),
          actions: JSON.parse(rule.actions),
          lastRunAt: rule.lastRunAt?.toISOString() ?? null,
          createdAt: rule.createdAt.toISOString(),
          updatedAt: rule.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
