import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { domain: { contains: search } },
        { website: { contains: search } },
        { industry: { contains: search } },
      ];
    }

    const accounts = await db.account.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = accounts.map((a) => ({
      ...a,
      locations: a.locations ? JSON.parse(a.locations) : [],
      customFields: a.customFields ? JSON.parse(a.customFields) : {},
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
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

    const account = await db.account.create({
      data: {
        name: body.name,
        domain: body.domain ?? null,
        website: body.website ?? null,
        industry: body.industry ?? null,
        employees: body.employees ?? null,
        locations: body.locations ? JSON.stringify(body.locations) : "[]",
        revenue: body.revenue ?? null,
        revenueCurrency: body.revenueCurrency ?? null,
        ownerRepId: body.ownerRepId ?? null,
        status: body.status ?? "active",
        country: body.country ?? null,
        customFields: body.customFields ? JSON.stringify(body.customFields) : "{}",
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "account",
        entityId: account.id,
        meta: JSON.stringify({ name: account.name }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...account,
          locations: JSON.parse(account.locations),
          customFields: JSON.parse(account.customFields),
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
