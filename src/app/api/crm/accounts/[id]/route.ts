import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const account = await db.account.findUnique({
      where: { id },
      include: { contacts: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...account,
        locations: account.locations ? JSON.parse(account.locations) : [],
        customFields: account.customFields ? JSON.parse(account.customFields) : {},
        contacts: account.contacts.map((c) => ({
          ...c,
          phones: c.phones ? JSON.parse(c.phones) : [],
          emails: c.emails ? JSON.parse(c.emails) : [],
          commPreferences: c.commPreferences ? JSON.parse(c.commPreferences) : {},
          tags: c.tags ? JSON.parse(c.tags) : [],
          customFields: c.customFields ? JSON.parse(c.customFields) : {},
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
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
    const fields = [
      "name", "domain", "website", "industry", "employees", "revenue",
      "revenueCurrency", "ownerRepId", "status", "country",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.locations !== undefined) data.locations = JSON.stringify(body.locations);
    if (body.customFields !== undefined) data.customFields = JSON.stringify(body.customFields);

    const account = await db.account.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "account",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...account,
        locations: account.locations ? JSON.parse(account.locations) : [],
        customFields: account.customFields ? JSON.parse(account.customFields) : {},
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
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

    await db.account.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "account",
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
