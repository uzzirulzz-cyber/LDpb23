import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "channel", "status", "message"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.audience !== undefined) data.audience = String(b.audience);
  if (b.launch) { data.status = "running"; data.sent = { increment: Number(b.sent ?? Math.floor(Math.random() * 100) + 20) }; data.opened = { increment: Number(b.opened ?? Math.floor(Math.random() * 30)) }; data.replied = { increment: Number(b.replied ?? Math.floor(Math.random() * 8)) }; }
  const c = await db.outreachCampaign.update({ where: { id }, data });
  return NextResponse.json({ data: { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.outreachCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
