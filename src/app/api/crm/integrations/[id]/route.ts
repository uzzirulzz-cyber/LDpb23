import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const integration = await db.integration.findUnique({ where: { id } });
    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: {
        ...integration,
        config: integration.config ? JSON.parse(integration.config) : {},
        lastSync: integration.lastSync?.toISOString() ?? null,
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
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

    const existing = await db.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    // Connect — honest state. No OAuth credentials in env means we cannot fake.
    if (body.connect === true) {
      const hasOauthEnv =
        process.env.GOOGLE_CLIENT_ID ||
        process.env.FACEBOOK_CLIENT_ID ||
        process.env.META_ACCESS_TOKEN ||
        process.env.STRIPE_SECRET_KEY ||
        process.env.SENDGRID_API_KEY ||
        process.env.TWILIO_AUTH_TOKEN;

      let status: string;
      let config: Record<string, unknown>;

      if (hasOauthEnv) {
        // Credentials exist for *some* provider — but we don't have a real
        // token exchange implementation in this route. Stay honest.
        status = "error";
        config = {
          error:
            "OAuth credentials detected but token exchange not yet implemented. Complete setup in Integrations UI.",
        };
      } else {
        status = "error";
        config = {
          error:
            "OAuth credentials not configured. Add GOOGLE_CLIENT_ID etc. to environment.",
        };
      }

      const integration = await db.integration.update({
        where: { id },
        data: {
          status,
          config: JSON.stringify(config),
        },
      });

      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "connect_attempt",
          entity: "integration",
          entityId: id,
          meta: JSON.stringify({ status, config }),
        },
      });

      return NextResponse.json({
        data: {
          ...integration,
          config: JSON.parse(integration.config),
          lastSync: integration.lastSync?.toISOString() ?? null,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        },
      });
    }

    // Disconnect
    if (body.disconnect === true) {
      const integration = await db.integration.update({
        where: { id },
        data: {
          status: "disconnected",
          config: "{}",
        },
      });

      await db.auditLog.create({
        data: {
          actor,
          actorId,
          action: "disconnect",
          entity: "integration",
          entityId: id,
          meta: JSON.stringify({}),
        },
      });

      return NextResponse.json({
        data: {
          ...integration,
          config: JSON.parse(integration.config),
          lastSync: integration.lastSync?.toISOString() ?? null,
          createdAt: integration.createdAt.toISOString(),
          updatedAt: integration.updatedAt.toISOString(),
        },
      });
    }

    // Generic update
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    if (body.config !== undefined) data.config = JSON.stringify(body.config);
    if (body.lastSync !== undefined) data.lastSync = body.lastSync;

    const integration = await db.integration.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "integration",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...integration,
        config: integration.config ? JSON.parse(integration.config) : {},
        lastSync: integration.lastSync?.toISOString() ?? null,
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
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

    await db.integration.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "delete",
        entity: "integration",
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
