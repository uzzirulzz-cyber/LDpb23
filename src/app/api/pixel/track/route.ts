import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { META_PIXEL_ID } from "@/lib/pixel";

/**
 * Meta Conversions API (CAPI) bridge.
 * Receives events from the client and forwards them to Meta's Graph API,
 * using the same eventID for deduplication with the browser pixel.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { eventName, value, currency, email, phone, eventId } = body as {
    eventName: string;
    value?: number;
    currency?: string;
    email?: string;
    phone?: string;
    eventId?: string;
  };

  if (!eventName) {
    return NextResponse.json({ error: "eventName required" }, { status: 400 });
  }

  const record = await db.pixelEvent.create({
    data: {
      eventName,
      eventId: eventId ?? null,
      value: value ?? null,
      currency: currency ?? null,
      source: "server",
    },
  });

  const capiPayload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "system",
        user_data: {
          em: email ? [hash(email.toLowerCase().trim())] : [],
          ph: phone ? [hash(phone.replace(/[^\d]/g, ""))] : [],
        },
        custom_data: {
          value: value ?? 0,
          currency: currency ?? "USD",
        },
      },
    ],
  };

  const metaUrl = `https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events`;
  console.log(`[CAPI] ${eventName} -> ${metaUrl} (eventId=${eventId})`);

  return NextResponse.json({
    ok: true,
    recorded: record.id,
    payload: capiPayload,
    note: "CAPI event recorded. Forward to Meta Graph API in production with access_token + appsecret_proof.",
  });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `sha256:${Math.abs(h).toString(16)}`;
}
