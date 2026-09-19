import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const verificationStatus = searchParams.get("verificationStatus");
    const assignedTo = searchParams.get("assignedTo");
    const archived = searchParams.get("archived");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (assignedTo) where.assignedTo = assignedTo;
    if (archived === "true") {
      where.archivedAt = { not: null };
    } else if (archived === "false") {
      where.archivedAt = null;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
        { website: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { rep: { select: { id: true, name: true, email: true } } },
    });

    const data = leads.map((l) => ({
      ...l,
      tags: l.tags ? JSON.parse(l.tags) : [],
      customFields: l.customFields ? JSON.parse(l.customFields) : {},
      auditTrail: l.auditTrail ? JSON.parse(l.auditTrail) : [],
      rawReference: l.rawReference ? JSON.parse(l.rawReference) : null,
      ingestionTimestamp: l.ingestionTimestamp?.toISOString() ?? null,
      enrichedAt: l.enrichedAt?.toISOString() ?? null,
      archivedAt: l.archivedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
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

    const auditTrail = [
      {
        action: "created",
        at: new Date().toISOString(),
        actor,
        note: "Lead created",
      },
    ];

    const lead = await db.lead.create({
      data: {
        name: body.name,
        company: body.company ?? null,
        website: body.website ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        whatsapp: body.whatsapp ?? null,
        country: body.country ?? null,
        city: body.city ?? null,
        industry: body.industry ?? null,
        jobTitle: body.jobTitle ?? null,
        source: body.source ?? "manual",
        sourceProvider: body.sourceProvider ?? null,
        externalId: body.externalId ?? null,
        ingestionTimestamp: new Date(),
        rawReference: body.rawReference ? JSON.stringify(body.rawReference) : null,
        status: body.status ?? "new",
        stage: body.stage ?? "new",
        verificationStatus: body.verificationStatus ?? "unverified",
        consentState: body.consentState ?? "unknown",
        value: body.value ?? 0,
        currency: body.currency ?? "PKR",
        score: body.score ?? 0,
        tags: body.tags ? JSON.stringify(body.tags) : "[]",
        customFields: body.customFields ? JSON.stringify(body.customFields) : "{}",
        auditTrail: JSON.stringify(auditTrail),
        assignedTo: body.assignedTo ?? null,
      },
    });

    await db.activity.create({
      data: {
        leadId: lead.id,
        type: "created",
        description: "Lead created",
        meta: JSON.stringify({ actor }),
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "lead",
        entityId: lead.id,
        meta: JSON.stringify({ name: lead.name }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...lead,
          tags: JSON.parse(lead.tags),
          customFields: JSON.parse(lead.customFields),
          auditTrail: JSON.parse(lead.auditTrail),
          rawReference: lead.rawReference ? JSON.parse(lead.rawReference) : null,
          ingestionTimestamp: lead.ingestionTimestamp?.toISOString() ?? null,
          enrichedAt: lead.enrichedAt?.toISOString() ?? null,
          archivedAt: lead.archivedAt?.toISOString() ?? null,
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
