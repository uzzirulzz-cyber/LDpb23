import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;

    const fields = await db.customField.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const data = fields.map((f) => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : [],
      createdAt: f.createdAt.toISOString(),
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

    const field = await db.customField.create({
      data: {
        entity: body.entity,
        name: body.name,
        label: body.label,
        type: body.type ?? "text",
        options: body.options ? JSON.stringify(body.options) : "[]",
        required: body.required ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "customField",
        entityId: field.id,
        meta: JSON.stringify({ name: field.name, target: field.entity }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...field,
          options: JSON.parse(field.options),
          createdAt: field.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
