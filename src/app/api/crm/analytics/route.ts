import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const PKR_RATES: Record<string, number> = {
  PKR: 1,
  USD: 278,
  EUR: 303,
  GBP: 352,
  AED: 76,
  SAR: 74,
};

export function toPkr(v: number, c?: string): number {
  if (!v || Number.isNaN(v)) return 0;
  const rate = PKR_RATES[(c || "PKR").toUpperCase()] ?? 1;
  return Math.round(v * rate);
}

export async function GET() {
  try {
    const [orders, leads, orderItemsWithProducts] = await Promise.all([
      db.order.findMany(),
      db.lead.findMany(),
      db.orderItem.findMany({
        include: { product: { select: { id: true, name: true, sku: true } } },
      }),
    ]);

    const empty = orders.length === 0 && leads.length === 0;

    // Revenue by month (paid orders only, in PKR)
    const revenueByMonth: Record<string, number> = {};
    for (const o of orders) {
      if (o.status !== "paid" && o.paymentStatus !== "paid") continue;
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + toPkr(o.total, o.currency);
    }
    const revenueByMonthArray = Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Orders by status
    const ordersByStatus: Record<string, number> = {};
    for (const o of orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    }

    // Leads by source
    const leadsBySource: Record<string, number> = {};
    for (const l of leads) {
      leadsBySource[l.source] = (leadsBySource[l.source] ?? 0) + 1;
    }

    // Leads by status
    const leadsByStatus: Record<string, number> = {};
    for (const l of leads) {
      leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;
    }

    // Conversion rate = won / (won + lost)
    const won = leadsByStatus["won"] ?? 0;
    const lost = leadsByStatus["lost"] ?? 0;
    const closed = won + lost;
    const conversionRate = closed > 0 ? Math.round((won / closed) * 1000) / 10 : null;

    // Top products by revenue (PKR, paid orders only)
    const paidOrderIds = new Set(
      orders
        .filter((o) => o.status === "paid" || o.paymentStatus === "paid")
        .map((o) => o.id)
    );
    const productRevenue: Record<string, { name: string; sku: string; revenue: number; qty: number }> = {};
    for (const it of orderItemsWithProducts) {
      if (!paidOrderIds.has(it.orderId)) continue;
      const key = it.productId;
      if (!productRevenue[key]) {
        productRevenue[key] = {
          name: it.name,
          sku: it.product?.sku ?? "",
          revenue: 0,
          qty: 0,
        };
      }
      productRevenue[key].revenue += toPkr(it.price * it.quantity, "PKR");
      productRevenue[key].qty += it.quantity;
    }
    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      data: {
        empty,
        revenueByMonth: revenueByMonthArray,
        ordersByStatus,
        leadsBySource,
        leadsByStatus,
        conversionRate: conversionRate === null ? "no data" : conversionRate,
        topProducts,
        totals: {
          orders: orders.length,
          leads: leads.length,
          paidOrders: paidOrderIds.size,
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
