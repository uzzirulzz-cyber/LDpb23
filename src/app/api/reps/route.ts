import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const reps = await db.rep.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: reps });
}
