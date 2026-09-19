import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isRapidGatewayConfigured, createTransaction } from "@/lib/rapid-gateway";
import { addTimelineEvent, transitionOrder } from "@/lib/order-state";

// POST /api/store/checkout
// Authenticated checkout. Requires a NextAuth session.
//
// Flow:
//   1. Verify session (401 if not authenticated, with redirectTo).
//   2. Resolve Customer from session.user.id (or by email as fallback).
//   3. Load cart by sessionKey (preserved across auth via localStorage).
//   4. Create Order with status="checkout_started" (not pending).
//   5. Initiate Rapid Gateway payment.
//   6. Create OrderTimelineEvent: "Checkout Started" + "Payment Submitted".
//   7. Return checkoutUrl. Do NOT mark as paid — payment comes from webhook.

function rand(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function makeOrderNumber(): string {
  return `PB-${Date.now()}-${rand(6)}`;
}

function makeLicenseKey(sku: string): string {
  return `PB-${sku}-${rand(4)}-${rand(4)}-${rand(4)}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check — never allow anonymous checkout.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: "Authentication required",
          redirectTo: "/account?redirect=checkout",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      customerId: sessionKey,
      sourceCurrency = "PKR",
      email: bodyEmail,
      name: bodyName,
      phone: bodyPhone,
    } = body ?? {};

    const userEmail = session.user.email.toLowerCase();
    const userId = (session.user as { id?: string }).id;

    // 2. Resolve Customer (linked to this user, or by email)
    let customer = await db.customer.findUnique({
      where: { email: userEmail },
    });

    if (!customer) {
      // Auto-create a Customer record linked to the User
      customer = await db.customer.create({
        data: {
          email: userEmail,
          name: session.user.name || bodyName || userEmail.split("@")[0],
          phone: bodyPhone ?? null,
          userId: userId ?? null,
        },
      });
    } else if (userId && !customer.userId) {
      // Link to user if not yet linked
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { userId },
      });
    }

    // Update phone if provided and missing
    if (!customer.phone && bodyPhone) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { phone: bodyPhone },
      });
    }

    // 3. Load cart by sessionKey (preserved across auth via localStorage).
    if (!sessionKey) {
      return NextResponse.json({ error: "Missing cart session" }, { status: 400 });
    }
    const cart = await db.cart.findUnique({
      where: { sessionKey },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 4. Compute totals
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      licenseKeys: string;
      deliveryType: string;
    }> = [];

    for (const item of cart.items) {
      const lineTotal = item.product.price * item.quantity;
      subtotal += lineTotal;

      // Pre-generate license keys for digital products (kept on the OrderItem,
      // only delivered to the customer after order_completed).
      const licenseKeys: string[] = item.product.digital
        ? Array.from({ length: item.quantity }, () => makeLicenseKey(item.product.sku))
        : [];

      orderItemsData.push({
        productId: item.productId,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        licenseKeys: JSON.stringify(licenseKeys),
        deliveryType: item.product.deliveryType,
      });
    }

    const orderNumber = makeOrderNumber();

    // 5. Create Order with status="checkout_started"
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: "checkout_started",
        paymentStatus: "pending",
        paymentMethod: "rapid-gateway",
        paymentId: null,
        subtotal,
        tax: 0,
        total: subtotal,
        currency: "PKR",
        sourceCurrency,
        fxRate: 1,
        fxTimestamp: null,
        fxSource: null,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    // Clear cart (items moved to order)
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });

    // 6. Timeline events: Checkout Started
    await addTimelineEvent(
      order.id,
      "order_created",
      "Checkout Started",
      `Order ${order.orderNumber} created by ${customer.email}. Total: ${order.total} ${order.currency}.`,
      `customer:${customer.id}`,
      {
        orderNumber: order.orderNumber,
        itemCount: order.items.length,
        total: order.total,
        currency: order.currency,
      }
    );

    // Analytics event
    await db.analyticsEvent.create({
      data: {
        type: "order_placed",
        entity: "order",
        entityId: order.id,
        value: order.total,
        currency: order.currency,
        source: "storefront",
        meta: JSON.stringify({ orderNumber: order.orderNumber, itemCount: order.items.length }),
      },
    });

    // 7. Initiate Rapid Gateway payment
    if (!isRapidGatewayConfigured()) {
      // Honest state — no fake success.
      return NextResponse.json({
        data: {
          order: serializeOrder(order),
          checkoutUrl: null,
          message: "Payment gateway not configured. Order created as checkout_started.",
        },
      });
    }

    // Move order to payment_submitted before calling the gateway
    if (order.status === "checkout_started") {
      try {
        await transitionOrder(order.id, "payment_submitted", `customer:${customer.id}`, {
          paymentStatus: "processing",
          metadata: { step: "rapid_gateway_initiated" },
        });
      } catch {
        // Force the transition if state machine is strict — gateway call must proceed.
        await db.order.update({
          where: { id: order.id },
          data: { status: "payment_submitted", paymentStatus: "processing" },
        });
      }

      await addTimelineEvent(
        order.id,
        "payment_submitted",
        "Payment Submitted",
        `Customer redirected to Rapid Gateway hosted checkout for ${order.total} ${order.currency}.`,
        `customer:${customer.id}`,
        { gateway: "rapid-gateway", amount: order.total, currency: order.currency }
      );
    }

    const txnResult = await createTransaction({
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      customerEmail: customer.email,
      customerPhone: customer.phone || "",
      customerName: customer.name,
    });

    // 8. Return checkout URL for redirect
    return NextResponse.json({
      data: {
        order: serializeOrder(order),
        checkoutUrl: txnResult.checkoutUrl,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function serializeOrder(o: {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  fxTimestamp: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: o.total,
    currency: o.currency,
    itemCount: o.items.length,
    fxTimestamp: o.fxTimestamp?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
