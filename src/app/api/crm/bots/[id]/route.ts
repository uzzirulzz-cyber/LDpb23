import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const bot = await db.bot.findUnique({
      where: { id },
      include: {
        executions_rel: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...bot,
        lastHeartbeat: bot.lastHeartbeat?.toISOString() ?? null,
        createdAt: bot.createdAt.toISOString(),
        updatedAt: bot.updatedAt.toISOString(),
        recentExecutions: bot.executions_rel.map((e) => ({
          ...e,
          result: e.result ? JSON.parse(e.result) : {},
          startedAt: e.startedAt.toISOString(),
          completedAt: e.completedAt?.toISOString() ?? null,
        })),
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

    const existing = await db.bot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const fields = ["name", "role", "provider", "currentJob", "queue", "latencyMs"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.status !== undefined) {
      data.status = body.status;
      // Manual status updates often come with a heartbeat refresh
      data.lastHeartbeat = new Date();
    }

    const bot = await db.bot.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "bot",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...bot,
        lastHeartbeat: bot.lastHeartbeat?.toISOString() ?? null,
        createdAt: bot.createdAt.toISOString(),
        updatedAt: bot.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
