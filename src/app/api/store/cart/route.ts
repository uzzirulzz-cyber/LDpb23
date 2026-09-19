import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/store/cart?customerId=<sessionKey>
// Customer is created at checkout. Cart uses a guest session key.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionKey = searchParams.get("customerId")?.trim();
    if (!sessionKey) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

    let cart = await db.cart.findUnique({
      where: { sessionKey },
      include: { items: { include: { product: true } } },
    }) as { id: string; sessionKey: string; items: Array<{ id: string; cartId: string; productId: string; quantity: number; product: { images: string; variants: string; [k: string]: unknown } }> } | null;
    if (!cart) {
      cart = await db.cart.create({
        data: { sessionKey },
        include: { items: { include: { product: true } } },
      }) as { id: string; sessionKey: string; items: Array<{ id: string; cartId: string; productId: string; quantity: number; product: { images: string; variants: string; [k: string]: unknown } }> };
    }

    return NextResponse.json({
      data: {
        ...cart,
        items: cart.items.map((i) => ({
          ...i,
          product: { ...i.product, images: safeParseArray(i.product.images as string), variants: safeParseArray(i.product.variants as string) },
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId: sessionKey, productId, quantity } = body ?? {};
    if (!sessionKey || !productId) return NextResponse.json({ error: "customerId and productId required" }, { status: 400 });

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) return NextResponse.json({ error: "Product not available" }, { status: 404 });

    let cart = await db.cart.findUnique({ where: { sessionKey } });
    if (!cart) cart = await db.cart.create({ data: { sessionKey } });

    const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, productId } });
    let item;
    if (existing) {
      item = await db.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + qty }, include: { product: true } });
    } else {
      item = await db.cartItem.create({ data: { cartId: cart.id, productId, quantity: qty }, include: { product: true } });
    }
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

    return NextResponse.json({
      data: { ...item, product: { ...item.product, images: safeParseArray(item.product.images as string), variants: safeParseArray(item.product.variants as string) } },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionKey = searchParams.get("customerId")?.trim();
    if (!sessionKey) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
    const cart = await db.cart.findUnique({ where: { sessionKey } });
    if (!cart) return NextResponse.json({ data: { cleared: 0 } });
    const result = await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ data: { cleared: result.count } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

function safeParseArray(raw: string): unknown[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
}
