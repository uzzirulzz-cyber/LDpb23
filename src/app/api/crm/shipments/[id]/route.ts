import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const existing = await db.shipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const fields = ["orderId", "trackingNumber", "carrier", "address", "country"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    // Status transitions set shippedAt / deliveredAt automatically.
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === "shipped" || body.status === "in_transit") {
        if (!existing.shippedAt && !body.shippedAt) data.shippedAt = new Date();
      }
      if (body.status === "delivered") {
        if (!existing.deliveredAt && !body.deliveredAt) data.deliveredAt = new Date();
        if (!existing.shippedAt && !body.shippedAt) data.shippedAt = new Date();
      }
    }
    if (body.shippedAt !== undefined)
      data.shippedAt = body.shippedAt ? new Date(body.shippedAt) : null;
    if (body.deliveredAt !== undefined)
      data.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null;

    const shipment = await db.shipment.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "shipment",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body), status: shipment.status }),
      },
    });

    return NextResponse.json({
      data: {
        ...shipment,
        shippedAt: shipment.shippedAt?.toISOString() ?? null,
        deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
        createdAt: shipment.createdAt.toISOString(),
        updatedAt: shipment.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
