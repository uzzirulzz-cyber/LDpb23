import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const run = await db.funnelRun.findUnique({
      where: { id },
      include: { lead: { select: { id: true, name: true, email: true, company: true } } },
    });
    if (!run) {
      return NextResponse.json({ error: "Funnel run not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...run,
        stageHistory: run.stageHistory ? JSON.parse(run.stageHistory) : [],
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
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

    const existing = await db.funnelRun.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Funnel run not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.abandon === true) {
      data.status = "abandoned";
      data.completedAt = new Date();
      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "abandon",
          entity: "funnelRun",
          entityId: id,
          meta: JSON.stringify({ from: existing.status }),
        },
      });
    } else if (body.advance === true) {
      const stages = await db.funnelStage.findMany({ orderBy: { order: "asc" } });
      const currentIndex = stages.findIndex((s) => s.code === existing.currentStage);
      const nextStage = stages[currentIndex + 1];

      const history: Array<Record<string, string>> = existing.stageHistory
        ? JSON.parse(existing.stageHistory)
        : [];

      if (!nextStage) {
        // Complete
        data.status = "completed";
        data.completedAt = new Date();
        data.currentStage = existing.currentStage;
      } else {
        data.currentStage = nextStage.code;
        history.push({ stage: nextStage.code, at: new Date().toISOString() });
        data.stageHistory = JSON.stringify(history);
      }

      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "advance",
          entity: "funnelRun",
          entityId: id,
          meta: JSON.stringify({ to: data.currentStage }),
        },
      });
    } else {
      // Generic update
      if (body.status !== undefined) data.status = body.status;
      if (body.currentStage !== undefined) data.currentStage = body.currentStage;
      if (body.completedAt !== undefined) data.completedAt = body.completedAt;
    }

    const run = await db.funnelRun.update({ where: { id }, data });

    return NextResponse.json({
      data: {
        ...run,
        stageHistory: run.stageHistory ? JSON.parse(run.stageHistory) : [],
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
