import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const integrations = await db.integration.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = integrations.map((i) => ({
      ...i,
      config: i.config ? JSON.parse(i.config) : {},
      lastSync: i.lastSync?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
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

    const integration = await db.integration.create({
      data: {
        name: body.name,
        type: body.type,
        status: body.status ?? "disconnected",
        config: body.config ? JSON.stringify(body.config) : "{}",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "integration",
        entityId: integration.id,
        meta: JSON.stringify({ name: integration.name, type: integration.type }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...integration,
          config: JSON.parse(integration.config),
          lastSync: integration.lastSync?.toISOString() ?? null,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
