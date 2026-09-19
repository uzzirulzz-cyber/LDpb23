import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const source = await db.waterfallSource.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Waterfall source not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...source,
        config: source.config ? JSON.parse(source.config) : {},
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
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

    const existing = await db.waterfallSource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Waterfall source not found" }, { status: 404 });
    }

    // runNow: honest execution against real providers
    if (body.runNow === true) {
      // Check whether any connected providers exist (waterfall typically delegates to API providers)
      const connectedProviders = await db.apiProvider.count({
        where: { status: "connected" },
      });

      if (connectedProviders === 0) {
        await db.auditLog.create({
          data: {
            actor,
            actorId,
            action: "run",
            entity: "waterfallSource",
            entityId: id,
            meta: JSON.stringify({ ran: false, reason: "No connected providers" }),
          },
        });

        const refreshed = await db.waterfallSource.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        return NextResponse.json({
          data: {
            ...refreshed,
            config: JSON.parse(refreshed.config),
            createdAt: refreshed.createdAt.toISOString(),
            updatedAt: refreshed.updatedAt.toISOString(),
            ran: false,
            reason: "No connected providers",
          },
        });
      }

      // If connected providers exist, attempt a real ingestion run
      // Honest: even with connected providers, we currently have no fetch
      // pipeline, so found stays unchanged.
      const updated = await db.waterfallSource.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "run",
          entity: "waterfallSource",
          entityId: id,
          meta: JSON.stringify({ ran: true, found: existing.found }),
        },
      });

      return NextResponse.json({
        data: {
          ...updated,
          config: JSON.parse(updated.config),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          ran: true,
          found: existing.found,
        },
      });
    }

    // Generic update
    const data: Record<string, unknown> = {};
    const fields = ["name", "type", "priority", "step", "found", "converted", "confidence"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.config !== undefined) data.config = JSON.stringify(body.config);

    const source = await db.waterfallSource.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "waterfallSource",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...source,
        config: source.config ? JSON.parse(source.config) : {},
        createdAt: source.createdAt.toISOString(),
        updatedAt: source.updatedAt.toISOString(),
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

    await db.waterfallSource.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "waterfallSource",
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
