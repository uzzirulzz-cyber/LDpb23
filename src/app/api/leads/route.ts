import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LeadStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const repId = searchParams.get("repId");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status as LeadStatus;
  if (source && source !== "all") where.source = source;
  if (repId && repId !== "all") where.assignedTo = repId;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    include: { rep: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    data: leads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, company, country, source, value, currency, score, assignedTo } = body;

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "name, email and phone are required" }, { status: 400 });
  }

  const lead = await db.lead.create({
    data: {
      name,
      email,
      phone,
      company: company ?? null,
      country: country ?? null,
      source: source ?? "website",
      status: "new",
      stage: "new",
      value: Number(value ?? 0),
      currency: currency ?? "PKR",
      score: Number(score ?? 50),
      assignedTo: assignedTo ?? null,
    },
    include: { rep: true },
  });

  await db.activity.create({
    data: {
      leadId: lead.id,
      type: "note",
      description: `Lead created via dashboard — source: ${lead.source}.`,
    },
  });

  return NextResponse.json({
    data: {
      ...lead,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    },
  });
}
