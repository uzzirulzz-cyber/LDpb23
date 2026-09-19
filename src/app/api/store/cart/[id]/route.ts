import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/store/cart/[id]
// Body: { quantity: number }
// Update the quantity of a single CartItem.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    const body = await req.json();
    const quantity = parseInt(body?.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be a positive integer" },
        { status: 400 }
      );
    }

    const existing = await db.cartItem.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    const item = await db.cartItem.update({
      where: { id },
      data: { quantity },
      include: { product: true },
    });

    return NextResponse.json({
      data: {
        ...item,
        product: {
          ...item.product,
          images: safeParseArray(item.product.images),
          variants: safeParseArray(item.product.variants),
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/store/cart/[id]
// Remove a single CartItem from its cart.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    const existing = await db.cartItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    await db.cartItem.delete({ where: { id } });

    return NextResponse.json({ data: { id, removed: true } });
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
