import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Meta CAPI bridge — receives pixel events from the storefront (browser)
// and persists them server-side. The real Meta Graph API call can be
// layered on top by an integration; here we store the event for replay
// and analytics. No mock events — only what the client sent.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.eventName) {
      return NextResponse.json(
        { error: "eventName is required" },
        { status: 400 }
      );
    }

    const evt = await db.pixelEvent.create({
      data: {
        eventName: body.eventName,
        eventId: body.eventId ?? null,
        value: body.value ?? null,
        currency: body.currency ?? null,
        source: body.source ?? "client",
      },
    });

    return NextResponse.json(
      {
        data: {
          ok: true,
          id: evt.id,
          eventName: evt.eventName,
          createdAt: evt.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
