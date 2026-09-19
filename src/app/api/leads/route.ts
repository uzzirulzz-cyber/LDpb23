import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const repId = searchParams.get("repId");
  const limit = parseInt(searchParams.get("limit") ?? "200", 10);
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (source && source !== "all") where.source = source;
  if (repId && repId !== "all") where.assignedTo = repId;
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { company: { contains: search } }, { phone: { contains: search } }];
  const leads = await db.lead.findMany({ where, include: { rep: true }, orderBy: { createdAt: "desc" }, take: limit });
  return NextResponse.json({ data: leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.name || !b.email || !b.phone) return NextResponse.json({ error: "name, email, phone required" }, { status: 400 });
  const lead = await db.lead.create({
    data: { name: b.name, email: b.email, phone: b.phone, company: b.company ?? null, country: b.country ?? null,
      source: b.source ?? "website", status: "new", stage: "new", value: Number(b.value ?? 0), currency: b.currency ?? "PKR",
      score: Number(b.score ?? 50), assignedTo: b.assignedTo ?? null },
    include: { rep: true },
  });
  await db.activity.create({ data: { leadId: lead.id, type: "note", description: `Lead created — source: ${lead.source}.` } });
  return NextResponse.json({ data: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() } });
}
