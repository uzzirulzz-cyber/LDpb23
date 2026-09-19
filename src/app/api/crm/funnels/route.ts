import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stages = await db.funnelStage.findMany({
      orderBy: { order: "asc" },
    });
    const data = stages.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
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

    // Determine next order
    const last = await db.funnelStage.findFirst({ orderBy: { order: "desc" } });
    const order = body.order ?? (last ? last.order + 1 : 1);

    const stage = await db.funnelStage.create({
      data: {
        name: body.name,
        code: body.code,
        order,
        type: body.type ?? "default",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "funnelStage",
        entityId: stage.id,
        meta: JSON.stringify({ name: stage.name, code: stage.code }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...stage,
          createdAt: stage.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
