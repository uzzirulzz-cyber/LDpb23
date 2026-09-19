import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { META_PIXEL_ID } from "@/lib/pixel";
export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.eventName) return NextResponse.json({ error: "eventName required" }, { status: 400 });
  const record = await db.pixelEvent.create({ data: { eventName: b.eventName, eventId: b.eventId ?? null, value: b.value ?? null, currency: b.currency ?? null, source: "server" } });
  console.log(`[CAPI] ${b.eventName} -> graph.facebook.com/v20.0/${META_PIXEL_ID}/events (eventId=${b.eventId})`);
  return NextResponse.json({ ok: true, recorded: record.id });
}
