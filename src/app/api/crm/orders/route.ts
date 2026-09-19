import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      // Search by order number OR by customer email (need to look up customer)
      const matchingCustomers = await db.customer.findMany({
        where: { email: { contains: search } },
        select: { id: true },
      });
      where.OR = [
        { orderNumber: { contains: search } },
        ...(matchingCustomers.length > 0
          ? [{ customerId: { in: matchingCustomers.map((c) => c.id) } }]
          : []),
      ];
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    const data = orders.map((o) => ({
      ...o,
      items: [],
      fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
