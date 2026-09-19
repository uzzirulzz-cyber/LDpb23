import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const blocks = await db.homepageBlock.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ data: blocks.map((b) => ({ ...b, content: JSON.parse(b.content), createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.type || !b.title) return NextResponse.json({ error: "type, title required" }, { status: 400 });
  const maxOrder = await db.homepageBlock.aggregate({ _max: { sortOrder: true } });
  const block = await db.homepageBlock.create({ data: { type: b.type, title: b.title, content: JSON.stringify(b.content ?? {}), sortOrder: b.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1, enabled: b.enabled ?? true } });
  return NextResponse.json({ data: { ...block, content: JSON.parse(block.content), createdAt: block.createdAt.toISOString(), updatedAt: block.updatedAt.toISOString() } });
}
