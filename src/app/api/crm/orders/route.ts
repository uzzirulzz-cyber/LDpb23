import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/crm/orders
// Enhanced orders list — full relations + filters + search.
//
// Filters:
//   ?status=                (order status)
//   ?paymentStatus=         (payment status)
//   ?verificationStatus=    (verification status)
//   ?search=                (matches orderNumber, customer email, customer phone)
//   ?assignedStaffId=
//   ?limit=                 (default 100)

function serializeOrder(o: {
  fxTimestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
  adminNotes: string;
  auditHistory: string;
  timeline?: unknown[];
  communications?: unknown[];
  [k: string]: unknown;
}) {
  return {
    ...o,
    adminNotes: safeParseArray(o.adminNotes),
    auditHistory: safeParseArray(o.auditHistory),
    fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function safeParseArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const verificationStatus = searchParams.get("verificationStatus");
    const assignedStaffId = searchParams.get("assignedStaffId");
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId;

    if (search) {
      // Search customer email + phone (case-insensitive) and orderNumber
      const matchingCustomers = await db.customer.findMany({
        where: {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        },
        select: { id: true },
      });
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        ...(matchingCustomers.length > 0
          ? [{ customerId: { in: matchingCustomers.map((c) => c.id) } }]
          : []),
      ];
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, country: true, city: true },
        },
        items: true,
        timeline: { orderBy: { createdAt: "desc" }, take: 20 },
        communications: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    const data = orders.map((o) => ({
      ...serializeOrder(o),
      items: o.items.map((it) => ({
        ...it,
        licenseKeys: safeParseArray(it.licenseKeys),
      })),
      timeline: (o.timeline as unknown[]).map((e) => ({
        ...(e as Record<string, unknown>),
        metadata: safeParseArrayOrObject((e as { metadata?: string }).metadata),
        createdAt: (e as { createdAt: Date }).createdAt.toISOString(),
      })),
      communications: (o.communications as unknown[]).map((c) => ({
        ...(c as Record<string, unknown>),
        createdAt: (c as { createdAt: Date }).createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({ data, count: data.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[crm/orders] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParseArrayOrObject(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
