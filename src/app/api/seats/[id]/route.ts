import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["label", "role", "status"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.repId !== undefined) data.repId = b.repId || null;
  if (b.status === "active") data.lastActiveAt = new Date();
  const seat = await db.seat.update({ where: { id }, data, include: { rep: true } });
  return NextResponse.json({ data: { ...seat, lastActiveAt: seat.lastActiveAt?.toISOString() ?? null, createdAt: seat.createdAt.toISOString(), updatedAt: seat.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.seat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
