import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const action = searchParams.get("action");
    const actor = searchParams.get("actor");
    const take = Number(searchParams.get("take") ?? 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (actor) where.actor = actor;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(take, 1), 200),
        skip,
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    const data = logs.map((l) => ({
      ...l,
      meta: l.meta ? JSON.parse(l.meta) : {},
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, total, skip, take });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
