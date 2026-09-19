import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const contact = await db.contact.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true, domain: true, website: true } },
      },
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...contact,
        phones: contact.phones ? JSON.parse(contact.phones) : [],
        emails: contact.emails ? JSON.parse(contact.emails) : [],
        commPreferences: contact.commPreferences ? JSON.parse(contact.commPreferences) : {},
        tags: contact.tags ? JSON.parse(contact.tags) : [],
        customFields: contact.customFields ? JSON.parse(contact.customFields) : {},
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
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
      "accountId", "firstName", "lastName", "email", "whatsapp", "jobTitle",
      "country", "city", "lifecycleStage", "consentState", "source", "assignedTo",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.phones !== undefined) data.phones = JSON.stringify(body.phones);
    if (body.emails !== undefined) data.emails = JSON.stringify(body.emails);
    if (body.commPreferences !== undefined) data.commPreferences = JSON.stringify(body.commPreferences);
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
    if (body.customFields !== undefined) data.customFields = JSON.stringify(body.customFields);

    const contact = await db.contact.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "contact",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...contact,
        phones: contact.phones ? JSON.parse(contact.phones) : [],
        emails: contact.emails ? JSON.parse(contact.emails) : [],
        commPreferences: contact.commPreferences ? JSON.parse(contact.commPreferences) : {},
        tags: contact.tags ? JSON.parse(contact.tags) : [],
        customFields: contact.customFields ? JSON.parse(contact.customFields) : {},
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
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

    await db.contact.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "contact",
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
