import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
      },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...customer,
        orders: customer.orders.map((o) => ({
          ...o,
          items: o.items.map((it) => ({
            ...it,
            licenseKeys: it.licenseKeys ? JSON.parse(it.licenseKeys) : [],
          })),
          fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        })),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
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
    const fields = ["email", "name", "phone", "country", "city", "address", "userId"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    const customer = await db.customer.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "customer",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...customer,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
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

    await db.customer.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "customer",
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
