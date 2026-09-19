import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (search) where.OR = [{ orderNumber: { contains: search } }, { customerName: { contains: search } }, { customerEmail: { contains: search } }];
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: orders.map((o) => ({ ...o, items: JSON.parse(o.items), licenseKeys: JSON.parse(o.licenseKeys), createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b.items || !b.customerName || !b.customerEmail) return NextResponse.json({ error: "items, customerName, customerEmail required" }, { status: 400 });
  const items = b.items as { name: string; price: number; qty: number; licenseKeys?: string[]; deliveryType?: string }[];
  const total = items.reduce((s: number, it) => s + it.qty * it.price, 0);
  const allKeys = items.flatMap((it) => it.licenseKeys ?? []);
  const now = new Date();
  const order = await db.order.create({
    data: { orderNumber: `PB-${now.getTime().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      customerName: b.customerName, customerEmail: b.customerEmail, userId: b.userId ?? null,
      status: b.status ?? "completed", total: Number(total.toFixed(2)), currency: b.currency ?? "USD",
      paymentMethod: b.paymentMethod ?? "card", items: JSON.stringify(items), licenseKeys: JSON.stringify(allKeys) },
  });
  return NextResponse.json({ data: { ...order, items: JSON.parse(order.items), licenseKeys: JSON.parse(order.licenseKeys), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() } });
}
