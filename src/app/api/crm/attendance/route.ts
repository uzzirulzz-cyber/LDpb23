import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (from || to) {
      const range: Record<string, Date> = {};
      if (from) {
        const f = new Date(from);
        f.setHours(0, 0, 0, 0);
        range.gte = f;
      }
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        range.lte = t;
      }
      where.date = range;
    }

    const records = await db.attendance.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        employee: {
          select: { id: true, name: true, email: true, department: true, role: true },
        },
      },
    });

    const data = records.map((a) => ({
      ...a,
      date: a.date.toISOString(),
      checkIn: a.checkIn?.toISOString() ?? null,
      checkOut: a.checkOut?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = req.headers.get("x-actor") ?? "system";
    const actorId = req.headers.get("x-actor-id") ?? null;

    if (!body.employeeId || !body.date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 }
      );
    }

    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0);

    const attendance = await db.attendance.create({
      data: {
        employeeId: body.employeeId,
        date,
        checkIn: body.checkIn ? new Date(body.checkIn) : null,
        checkOut: body.checkOut ? new Date(body.checkOut) : null,
        status: body.status ?? "present",
        notes: body.notes ?? null,
      },
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
        action: "create",
        entity: "attendance",
        entityId: attendance.id,
        meta: JSON.stringify({
          employeeId: attendance.employeeId,
          date: attendance.date.toISOString(),
          status: attendance.status,
        }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...attendance,
          date: attendance.date.toISOString(),
          checkIn: attendance.checkIn?.toISOString() ?? null,
          checkOut: attendance.checkOut?.toISOString() ?? null,
          createdAt: attendance.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
