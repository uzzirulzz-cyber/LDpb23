import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FX_RATES_FALLBACK, type Currency } from "@/lib/currency";

// POST /api/store/checkout
// Real checkout flow. Honest: no payment gateway is connected.
// If paymentMethod is provided, the order is marked `paid` (with paymentId=null)
// and an audit note records the absence of a real gateway. If paymentMethod
// is omitted, the order is created in `pending`/`unpaid`.
//
// Body: {
//   customerId?: string,
//   email?: string,        // used to find-or-create Customer if customerId missing
//   name?: string,
//   phone?: string,
//   paymentMethod?: string,  // e.g. "card", "bank_transfer", "easypaisa"
//   sourceCurrency?: "PKR" | "USD" | "EUR" | "GBP" | "AED" | "SAR"
// }
//
// Flow:
//   1. Resolve / create Customer.
//   2. Load cart with items + products.
//   3. Validate physical stock (decrement on commit).
//   4. Create Order + OrderItems (copy cart snapshot, generate license keys
//      for digital products).
//   5. Compute subtotal/total (PKR base). If sourceCurrency != PKR, set
//      fxRate/fxTimestamp/fxSource using fallback rates.
//   6. Clear cart.
//   7. Create AnalyticsEvent (order_placed + payment_received when paid).
//   8. Fire Meta Pixel Purchase event via /api/pixel/track.
//   9. Return order with items + licenseKeys.

function rand(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function makeOrderNumber(): string {
  return `PB-${Date.now()}-${rand(6)}`;
}

function makeLicenseKey(sku: string): string {
  return `PB-${sku}-${rand(4)}-${rand(4)}-${rand(4)}`;
}

function pkrToSource(pkr: number, source: Currency): { fxRate: number; total: number } {
  if (source === "PKR") return { fxRate: 1, total: pkr };
  // FX_RATES_FALLBACK is per-USD. PKR per USD ≈ 278.
  const pkrPerUsd = FX_RATES_FALLBACK.PKR;
  const sourcePerUsd = FX_RATES_FALLBACK[source] ?? 1;
  // sourceCurrency per 1 PKR
  const fxRate = sourcePerUsd / pkrPerUsd;
  return { fxRate, total: pkr * fxRate };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      customerId: sessionKey, // storefront passes the guest cart session key here
      email,
      name,
      phone,
      paymentMethod,
      sourceCurrency = "PKR",
    } = body ?? {};

    const source = (typeof sourceCurrency === "string" ? sourceCurrency.toUpperCase() : "PKR") as Currency;

    // 1. Resolve / create Customer (created at checkout from email)
    let customer = null as { id: string } | null;
    if (email) customer = await db.customer.findUnique({ where: { email } });
    if (!customer) {
      if (!email) {
        return NextResponse.json(
          { error: "Cannot resolve customer: provide email." },
          { status: 400 }
        );
      }
      customer = await db.customer.create({
        data: {
          email,
          name: name || email.split("@")[0] || "Customer",
          phone: phone ?? null,
        },
      });
    }

    // 2. Load cart by session key (guest cart — not linked to Customer)
    if (!sessionKey) {
      return NextResponse.json({ error: "Missing cart session (customerId)" }, { status: 400 });
    }
    const cart = await db.cart.findUnique({
      where: { sessionKey },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 3. Validate stock for physical items
    for (const item of cart.items) {
      if (!item.product.digital) {
        if (item.product.stock < item.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for ${item.product.name}`,
              sku: item.product.sku,
              available: item.product.stock,
              requested: item.quantity,
            },
            { status: 409 }
          );
        }
      }
    }

    const paid = Boolean(paymentMethod);
    const orderNumber = makeOrderNumber();

    // 4-6. Transaction: create order, items, decrement stock, clear cart
    const order = await db.$transaction(async (tx) => {
      // Subtotal in PKR base (product.price already in PKR default)
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

        // Decrement stock for physical products
        if (!item.product.digital) {
          await tx.product.update({
            where: { id: item.product.id },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.inventoryItem.updateMany({
            where: { productId: item.product.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // FX handling
      const fx = pkrToSource(subtotal, source);
      const fxActive = source !== "PKR";

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer!.id,
          status: paid ? "paid" : "pending",
          paymentStatus: paid ? "paid" : "unpaid",
          paymentMethod: paymentMethod ?? null,
          paymentId: null,
          subtotal,
          tax: 0,
          total: subtotal, // stored in PKR base
          currency: "PKR",
          sourceCurrency: source,
          fxRate: fx.fxRate,
          fxTimestamp: fxActive ? new Date() : null,
          fxSource: fxActive ? "playbeat-fallback" : null,
          attribution: paid
            ? JSON.stringify({ note: "No payment gateway connected. Marked paid by paymentMethod only; paymentId is null." })
            : null,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // Clear cart items (keep cart row so customer has a cart next time)
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    // 7. Analytics events
    await db.analyticsEvent.createMany({
      data: [
        {
          type: "order_placed",
          entity: "order",
          entityId: order.id,
          value: order.total,
          currency: order.currency,
          source: "storefront",
          meta: JSON.stringify({ orderNumber: order.orderNumber, itemCount: order.items.length }),
        },
        ...(paid
          ? [
              {
                type: "payment_received" as const,
                entity: "order" as const,
                entityId: order.id,
                value: order.total,
                currency: order.currency,
                source: "storefront" as const,
                meta: JSON.stringify({
                  orderNumber: order.orderNumber,
                  paymentMethod,
                  paymentId: null,
                  note: "No gateway connected — recorded as paid by paymentMethod only.",
                }),
              },
            ]
          : []),
      ],
    });

    // 8. Fire Meta Pixel Purchase event via /api/pixel/track (best-effort)
    try {
      const origin = new URL(req.url).origin;
      await fetch(`${origin}/api/pixel/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Purchase",
          value: order.total,
          currency: order.currency,
          eventId: `purchase_${order.id}`,
          source: "server-checkout",
        }),
      });
    } catch {
      // best-effort, never block checkout
    }

    // 9. Return order with items + licenseKeys parsed
    return NextResponse.json({
      data: {
        ...order,
        items: order.items.map((i) => ({
          ...i,
          licenseKeys: safeParseArray(i.licenseKeys),
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function safeParseArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
