import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/store/orders/status?orderNumber=PB-xxx
// Returns order + payment status + license keys (if paid).
// Used by the payment success page to poll for webhook confirmation.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber");

  if (!orderNumber) {
    return NextResponse.json({ error: "Missing orderNumber" }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      currency: order.currency,
      items: order.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        licenseKeys: i.licenseKeys, // raw JSON string
        deliveryType: i.deliveryType,
      })),
    },
  });
}
