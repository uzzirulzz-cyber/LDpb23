import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);
  const leadId = searchParams.get("leadId");

  const where = leadId ? { leadId } : {};
  const activities = await db.activity.findMany({
    where,
    include: { lead: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    data: activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      lead: a.lead ? { ...a.lead } : undefined,
    })),
  });
}
