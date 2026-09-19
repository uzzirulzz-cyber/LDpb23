import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const providers = await db.apiProvider.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = providers.map((p) => ({
      ...p,
      config: p.config ? JSON.parse(p.config) : {},
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
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

    const provider = await db.apiProvider.create({
      data: {
        name: body.name,
        type: body.type ?? "rest",
        endpoint: body.endpoint ?? null,
        status: body.status ?? "disconnected",
        config: body.config ? JSON.stringify(body.config) : "{}",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "apiProvider",
        entityId: provider.id,
        meta: JSON.stringify({ name: provider.name, type: provider.type }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...provider,
          config: JSON.parse(provider.config),
          createdAt: provider.createdAt.toISOString(),
          updatedAt: provider.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
