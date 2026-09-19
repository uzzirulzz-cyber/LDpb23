import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRapidGatewayConfigured, createTransaction } from "@/lib/rapid-gateway";

// POST /api/store/checkout
// Creates a pending order, then initiates Rapid Gateway payment.
// Returns { checkoutUrl } — frontend redirects to Rapid Gateway hosted checkout.
// After payment, Rapid Gateway sends a webhook to /webhooks/rapid-gateway
// which marks the order as paid + generates license keys.

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
    const body = await req.json().catch(() => ({}));
    const {
      customerId: sessionKey,
      email,
      name,
      phone,
      sourceCurrency = "PKR",
    } = body ?? {};

    // 1. Resolve / create Customer
    let customer = null as { id: string; email: string; name: string; phone: string | null } | null;
    if (email) {
      customer = await db.customer.findUnique({ where: { email } }) as typeof customer;
    }
    if (!customer) {
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      customer = await db.customer.create({
        data: {
          email,
          name: name || email.split("@")[0] || "Customer",
          phone: phone ?? null,
        },
      }) as typeof customer;
    }

    // 2. Load cart
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

    // 3. Compute total (PKR)
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

    // 4. Create order as PENDING (not paid yet — payment happens on Rapid Gateway)
    const order = await db.order.create({
      data: {
        orderNumber,
        customerId: customer!.id,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "rapid-gateway",
        paymentId: null,
        subtotal,
        tax: 0,
        total: subtotal,
        currency: "PKR",
        sourceCurrency: sourceCurrency,
        fxRate: 1,
        fxTimestamp: null,
        fxSource: null,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    // Clear cart
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Create analytics event
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

    // 5. Initiate Rapid Gateway payment
    if (!isRapidGatewayConfigured()) {
      // No gateway configured — return order for manual payment
      // (honest state, not fake success)
      return NextResponse.json({
        data: {
          order,
          checkoutUrl: null,
          message: "Payment gateway not configured. Order created as pending.",
        },
      });
    }

    const txnResult = await createTransaction({
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      customerEmail: customer!.email,
      customerPhone: customer!.phone || "",
      customerName: customer!.name,
    });

    // 6. Return checkout URL for redirect
    return NextResponse.json({
      data: {
        order,
        checkoutUrl: txnResult.checkoutUrl,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[checkout] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
