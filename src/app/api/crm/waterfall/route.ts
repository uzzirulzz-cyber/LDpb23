import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const sources = await db.waterfallSource.findMany({
      orderBy: { step: "asc" },
    });
    const data = sources.map((s) => ({
      ...s,
      config: s.config ? JSON.parse(s.config) : {},
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
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

    const source = await db.waterfallSource.create({
      data: {
        name: body.name,
        type: body.type ?? "api",
        priority: body.priority ?? 10,
        step: body.step ?? 1,
        enabled: body.enabled ?? true,
        config: body.config ? JSON.stringify(body.config) : "{}",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "waterfallSource",
        entityId: source.id,
        meta: JSON.stringify({ name: source.name }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...source,
          config: JSON.parse(source.config),
          createdAt: source.createdAt.toISOString(),
          updatedAt: source.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
