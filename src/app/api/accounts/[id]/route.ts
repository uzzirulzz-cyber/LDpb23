import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "website", "industry", "country", "currency", "size", "ownerRepId"]) if (b[k] !== undefined) data[k] = b[k];
  const account = await db.account.update({ where: { id }, data });
  return NextResponse.json({ data: { ...account, createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString() } });
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
