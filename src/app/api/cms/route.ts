import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const pages = await db.cmsPage.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ data: pages.map((p) => ({ ...p, content: JSON.parse(p.content), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.slug || !b.title) return NextResponse.json({ error: "slug, title required" }, { status: 400 });
  const page = await db.cmsPage.create({ data: { slug: b.slug, title: b.title, status: b.status ?? "draft", content: JSON.stringify(b.content ?? {}) } });
  return NextResponse.json({ data: { ...page, content: JSON.parse(page.content), createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString() } });
}
