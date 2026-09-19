import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["slug", "title", "status"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.content !== undefined) data.content = JSON.stringify(b.content);
  const page = await db.cmsPage.update({ where: { id }, data });
  return NextResponse.json({ data: { ...page, content: JSON.parse(page.content), createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.cmsPage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
