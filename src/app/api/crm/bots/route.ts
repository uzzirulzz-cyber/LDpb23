import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const bots = await db.bot.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = bots.map((b) => ({
      ...b,
      lastHeartbeat: b.lastHeartbeat?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
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

    const bot = await db.bot.create({
      data: {
        name: body.name,
        role: body.role,
        provider: body.provider ?? null,
        status: body.status ?? "idle",
        enabled: body.enabled ?? true,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "bot",
        entityId: bot.id,
        meta: JSON.stringify({ name: bot.name, role: bot.role }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...bot,
          lastHeartbeat: bot.lastHeartbeat?.toISOString() ?? null,
          createdAt: bot.createdAt.toISOString(),
          updatedAt: bot.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
