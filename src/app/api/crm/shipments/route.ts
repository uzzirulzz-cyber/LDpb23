import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const shipments = await db.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = shipments.map((s) => ({
      ...s,
      shippedAt: s.shippedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
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

    const shippedAt = body.shippedAt
      ? new Date(body.shippedAt)
      : body.status === "shipped" || body.status === "in_transit"
      ? new Date()
      : null;
    const deliveredAt = body.deliveredAt
      ? new Date(body.deliveredAt)
      : body.status === "delivered"
      ? new Date()
      : null;

    const shipment = await db.shipment.create({
      data: {
        orderId: body.orderId ?? null,
        trackingNumber: body.trackingNumber ?? null,
        carrier: body.carrier ?? null,
        status: body.status ?? "pending",
        shippedAt,
        deliveredAt,
        address: body.address ?? null,
        country: body.country ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "shipment",
        entityId: shipment.id,
        meta: JSON.stringify({
          orderId: shipment.orderId,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
          status: shipment.status,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...shipment,
          shippedAt: shipment.shippedAt?.toISOString() ?? null,
          deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
          createdAt: shipment.createdAt.toISOString(),
          updatedAt: shipment.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
