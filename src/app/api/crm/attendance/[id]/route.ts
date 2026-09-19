import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    const data: Record<string, unknown> = {};
    const fields = ["status", "notes", "employeeId"];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.date !== undefined) {
      const d = new Date(body.date);
      d.setHours(0, 0, 0, 0);
      data.date = d;
    }
    if (body.checkIn !== undefined)
      data.checkIn = body.checkIn ? new Date(body.checkIn) : null;
    if (body.checkOut !== undefined)
      data.checkOut = body.checkOut ? new Date(body.checkOut) : null;

    const attendance = await db.attendance.update({
      where: { id },
      data,
      include: {
        employee: {
          select: { id: true, name: true, email: true, department: true, role: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "update",
        entity: "attendance",
        entityId: id,
        meta: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      data: {
        ...attendance,
        date: attendance.date.toISOString(),
        checkIn: attendance.checkIn?.toISOString() ?? null,
        checkOut: attendance.checkOut?.toISOString() ?? null,
        createdAt: attendance.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
