import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const provider = await db.apiProvider.findUnique({
      where: { id },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 20 } },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...provider,
        config: provider.config ? JSON.parse(provider.config) : {},
        runs: provider.runs.map((r) => ({
          ...r,
          startedAt: r.startedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
        })),
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
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

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.endpoint !== undefined) data.endpoint = body.endpoint;
    if (body.status !== undefined) data.status = body.status;
    if (body.config !== undefined) data.config = JSON.stringify(body.config);

    const provider = await db.apiProvider.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "apiProvider",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...provider,
        config: provider.config ? JSON.parse(provider.config) : {},
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
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

    await db.apiProvider.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "apiProvider",
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
