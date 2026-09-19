import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const where: Record<string, unknown> = {};
  if (campaignId && campaignId !== "all") where.campaignId = campaignId;
  const calls = await db.callLog.findMany({ where, orderBy: { startedAt: "desc" }, take: 100 });
  return NextResponse.json({ data: calls.map((c) => ({ ...c, startedAt: c.startedAt.toISOString(), createdAt: c.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.contactName || !b.contactPhone) return NextResponse.json({ error: "contactName, contactPhone required" }, { status: 400 });
  const call = await db.callLog.create({
    data: { campaignId: b.campaignId ?? null, leadId: b.leadId ?? null, contactName: b.contactName,
      contactPhone: b.contactPhone, direction: b.direction ?? "outbound", durationSec: Number(b.durationSec ?? 0),
      status: b.status ?? "completed", notes: b.notes ?? "" },
  });
  return NextResponse.json({ data: { ...call, startedAt: call.startedAt.toISOString(), createdAt: call.createdAt.toISOString() } });
}
