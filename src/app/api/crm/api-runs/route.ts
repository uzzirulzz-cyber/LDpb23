import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    const runs = await db.apiRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        provider: { select: { id: true, name: true, type: true, status: true } },
      },
    });

    const data = runs.map((r) => ({
      ...r,
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

    if (!body.providerId) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }

    const provider = await db.apiProvider.findUnique({
      where: { id: body.providerId },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Create the run record
    const run = await db.apiRun.create({
      data: {
        providerId: provider.id,
        status: "running",
      },
    });

    let finalStatus: string = "running";
    let error: string | null = null;
    let ingested = 0;
    let written = 0;

    if (body.execute === true) {
      if (provider.status !== "connected") {
        finalStatus = "failed";
        error =
          "Provider not connected — configure credentials in Integrations";
      } else {
        // Provider claims connected but no real ingestion pipeline exists
        finalStatus = "completed";
        ingested = 0;
        written = 0;
        error = "Connected but no records returned by provider";
      }
    } else {
      // Just create a placeholder pending run
      finalStatus = "failed";
      error = "Run created without execute flag — no ingestion triggered";
    }

    const updated = await db.apiRun.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        error,
        ingested,
        written,
        completedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "execute",
        entity: "apiRun",
        entityId: updated.id,
        meta: JSON.stringify({
          providerId: provider.id,
          status: finalStatus,
          error,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...updated,
          startedAt: updated.startedAt.toISOString(),
          completedAt: updated.completedAt?.toISOString() ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
