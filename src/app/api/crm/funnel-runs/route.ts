import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const runs = await db.funnelRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: { lead: { select: { id: true, name: true, email: true, company: true } } },
    });

    const data = runs.map((r) => ({
      ...r,
      stageHistory: r.stageHistory ? JSON.parse(r.stageHistory) : [],
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
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

    if (!body.leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // First stage
    const firstStage = await db.funnelStage.findFirst({ orderBy: { order: "asc" } });
    if (!firstStage) {
      return NextResponse.json(
        { error: "No funnel stages configured. Add stages first." },
        { status: 400 }
      );
    }

    const now = new Date();
    const stageHistory = [{ stage: firstStage.code, at: now.toISOString() }];

    const run = await db.funnelRun.create({
      data: {
        leadId: body.leadId,
        currentStage: firstStage.code,
        stageHistory: JSON.stringify(stageHistory),
        status: "running",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "funnelRun",
        entityId: run.id,
        meta: JSON.stringify({ leadId: body.leadId, stage: firstStage.code }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...run,
          stageHistory: JSON.parse(run.stageHistory),
          startedAt: run.startedAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
