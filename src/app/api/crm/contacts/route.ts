import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const lifecycleStage = searchParams.get("lifecycleStage");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (accountId) where.accountId = accountId;
    if (lifecycleStage) where.lifecycleStage = lifecycleStage;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { jobTitle: { contains: search } },
      ];
    }

    const contacts = await db.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = contacts.map((c) => ({
      ...c,
      phones: c.phones ? JSON.parse(c.phones) : [],
      emails: c.emails ? JSON.parse(c.emails) : [],
      commPreferences: c.commPreferences ? JSON.parse(c.commPreferences) : {},
      tags: c.tags ? JSON.parse(c.tags) : [],
      customFields: c.customFields ? JSON.parse(c.customFields) : {},
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

    const contact = await db.contact.create({
      data: {
        accountId: body.accountId ?? null,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phones: body.phones ? JSON.stringify(body.phones) : "[]",
        emails: body.emails ? JSON.stringify(body.emails) : "[]",
        whatsapp: body.whatsapp ?? null,
        jobTitle: body.jobTitle ?? null,
        country: body.country ?? null,
        city: body.city ?? null,
        lifecycleStage: body.lifecycleStage ?? "lead",
        consentState: body.consentState ?? "unknown",
        commPreferences: body.commPreferences ? JSON.stringify(body.commPreferences) : "{}",
        source: body.source ?? null,
        tags: body.tags ? JSON.stringify(body.tags) : "[]",
        customFields: body.customFields ? JSON.stringify(body.customFields) : "{}",
        assignedTo: body.assignedTo ?? null,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "contact",
        entityId: contact.id,
        meta: JSON.stringify({ name: `${contact.firstName} ${contact.lastName}` }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...contact,
          phones: JSON.parse(contact.phones),
          emails: JSON.parse(contact.emails),
          commPreferences: JSON.parse(contact.commPreferences),
          tags: JSON.parse(contact.tags),
          customFields: JSON.parse(contact.customFields),
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
