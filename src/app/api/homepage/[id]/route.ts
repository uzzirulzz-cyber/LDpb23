import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["type", "title"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.content !== undefined) data.content = JSON.stringify(b.content);
  if (b.sortOrder !== undefined) data.sortOrder = Number(b.sortOrder);
  if (b.enabled !== undefined) data.enabled = Boolean(b.enabled);
  const block = await db.homepageBlock.update({ where: { id }, data });
  return NextResponse.json({ data: { ...block, content: JSON.parse(block.content), createdAt: block.createdAt.toISOString(), updatedAt: block.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.homepageBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
