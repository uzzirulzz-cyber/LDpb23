import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = workflows.map((w) => ({
      ...w,
      steps: w.steps ? JSON.parse(w.steps) : [],
      lastRunAt: w.lastRunAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
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

    const workflow = await db.workflow.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        trigger: body.trigger,
        steps: body.steps ? JSON.stringify(body.steps) : "[]",
        enabled: body.enabled ?? false,
        owner: body.owner ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "workflow",
        entityId: workflow.id,
        meta: JSON.stringify({ name: workflow.name }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...workflow,
          steps: JSON.parse(workflow.steps),
          lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
          createdAt: workflow.createdAt.toISOString(),
          updatedAt: workflow.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
