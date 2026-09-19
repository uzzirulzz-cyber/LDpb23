import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const seats = await db.seat.findMany({ include: { rep: true }, orderBy: { label: "asc" } });
  return NextResponse.json({ data: seats.map((s) => ({ ...s, lastActiveAt: s.lastActiveAt?.toISOString() ?? null, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })) });
}

export async function POST() {
  const count = await db.seat.count();
  if (count >= 4) return NextResponse.json({ error: "Maximum 4 seats reached" }, { status: 400 });
  const seat = await db.seat.create({ data: { label: `Seat ${count + 1}`, status: "idle", role: "sales" } });
  return NextResponse.json({ data: { ...seat, lastActiveAt: null, createdAt: seat.createdAt.toISOString(), updatedAt: seat.updatedAt.toISOString() } });
}
