import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const country = searchParams.get("country");

    const where: Record<string, unknown> = {};
    if (country) where.country = country;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const customers = await db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = customers.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
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

    const customer = await db.customer.create({
      data: {
        userId: body.userId ?? null,
        email: body.email,
        name: body.name,
        phone: body.phone ?? null,
        country: body.country ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "customer",
        entityId: customer.id,
        meta: JSON.stringify({ name: customer.name, email: customer.email }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...customer,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
