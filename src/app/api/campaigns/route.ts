import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const campaigns = await db.outreachCampaign.findMany({ include: { _count: { select: { calls: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: campaigns.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.channel) return NextResponse.json({ error: "name, channel required" }, { status: 400 });
  const c = await db.outreachCampaign.create({
    data: { name: b.name, channel: b.channel, status: b.status ?? "draft", audience: String(b.audience ?? 0),
      message: b.message ?? "" },
  });
  return NextResponse.json({ data: { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() } });
}
