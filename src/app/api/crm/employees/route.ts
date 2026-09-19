import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const data = employees.map((e) => ({
      ...e,
      hireDate: e.hireDate?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
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

    const employee = await db.employee.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        role: body.role ?? "staff",
        department: body.department ?? null,
        status: body.status ?? "active",
        salary: typeof body.salary === "number" ? body.salary : Number(body.salary ?? 0),
        currency: body.currency ?? "PKR",
        hireDate: body.hireDate ? new Date(body.hireDate) : null,
      },
    });

    await db.auditLog.create({
      data: {
        actor,
        actorId,
        action: "create",
        entity: "employee",
        entityId: employee.id,
        meta: JSON.stringify({ name: employee.name, email: employee.email, role: employee.role }),
      },
    });

    return NextResponse.json(
      {
        data: {
          ...employee,
          hireDate: employee.hireDate?.toISOString() ?? null,
          createdAt: employee.createdAt.toISOString(),
          updatedAt: employee.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
