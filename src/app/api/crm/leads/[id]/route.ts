import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        rep: { select: { id: true, name: true, email: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        messages: { orderBy: { createdAt: "desc" }, take: 50 },
        deals: { orderBy: { createdAt: "desc" } },
        funnelRuns: { orderBy: { startedAt: "desc" } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...lead,
        tags: lead.tags ? JSON.parse(lead.tags) : [],
        customFields: lead.customFields ? JSON.parse(lead.customFields) : {},
        auditTrail: lead.auditTrail ? JSON.parse(lead.auditTrail) : [],
        rawReference: lead.rawReference ? JSON.parse(lead.rawReference) : null,
        ingestionTimestamp: lead.ingestionTimestamp?.toISOString() ?? null,
        enrichedAt: lead.enrichedAt?.toISOString() ?? null,
        archivedAt: lead.archivedAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        activities: lead.activities.map((a) => ({
          ...a,
          meta: a.meta ? JSON.parse(a.meta) : {},
          createdAt: a.createdAt.toISOString(),
        })),
        messages: lead.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
        deals: lead.deals.map((d) => ({
          ...d,
          closeDate: d.closeDate?.toISOString() ?? null,
          createdAt: d.createdAt.toISOString(),
        })),
        funnelRuns: lead.funnelRuns.map((r) => ({
          ...r,
          stageHistory: r.stageHistory ? JSON.parse(r.stageHistory) : [],
          startedAt: r.startedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
        })),
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

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const auditTrail: Array<Record<string, unknown>> = existing.auditTrail
      ? JSON.parse(existing.auditTrail)
      : [];

    const data: Record<string, unknown> = {};

    const allowedFields = [
      "name", "company", "website", "email", "phone", "whatsapp",
      "country", "city", "industry", "jobTitle", "source", "sourceProvider",
      "externalId", "stage", "verificationStatus", "consentState", "value",
      "currency", "score", "assignedTo", "enrichedAt",
    ];
    for (const f of allowedFields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
    if (body.customFields !== undefined) data.customFields = JSON.stringify(body.customFields);
    if (body.rawReference !== undefined) data.rawReference = JSON.stringify(body.rawReference);

    // Status change
    if (body.status !== undefined && body.status !== existing.status) {
      auditTrail.push({
        action: "status_change",
        at: new Date().toISOString(),
        actor,
        from: existing.status,
        to: body.status,
      });
      await db.activity.create({
        data: {
          leadId: id,
          type: "status_change",
          description: `Status changed from ${existing.status} to ${body.status}`,
          meta: JSON.stringify({ from: existing.status, to: body.status, actor }),
        },
      });
    }

    // Assignment change
    if (body.assignedTo !== undefined && body.assignedTo !== existing.assignedTo) {
      auditTrail.push({
        action: "assigned",
        at: new Date().toISOString(),
        actor,
        from: existing.assignedTo,
        to: body.assignedTo,
      });
      await db.activity.create({
        data: {
          leadId: id,
          type: "assigned",
          description: `Lead reassigned`,
          meta: JSON.stringify({ from: existing.assignedTo, to: body.assignedTo, actor }),
        },
      });
    }

    // Archive
    if (body.archived === true && !existing.archivedAt) {
      data.archivedAt = new Date();
      auditTrail.push({
        action: "archived",
        at: new Date().toISOString(),
        actor,
      });
    } else if (body.archived === false && existing.archivedAt) {
      data.archivedAt = null;
      auditTrail.push({
        action: "unarchived",
        at: new Date().toISOString(),
        actor,
      });
    }

    data.auditTrail = JSON.stringify(auditTrail);
    data.updatedAt = new Date();

    const lead = await db.lead.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "lead",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...lead,
        tags: lead.tags ? JSON.parse(lead.tags) : [],
        customFields: lead.customFields ? JSON.parse(lead.customFields) : {},
        auditTrail: lead.auditTrail ? JSON.parse(lead.auditTrail) : [],
        rawReference: lead.rawReference ? JSON.parse(lead.rawReference) : null,
        ingestionTimestamp: lead.ingestionTimestamp?.toISOString() ?? null,
        enrichedAt: lead.enrichedAt?.toISOString() ?? null,
        archivedAt: lead.archivedAt?.toISOString() ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
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

    await db.lead.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "lead",
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
