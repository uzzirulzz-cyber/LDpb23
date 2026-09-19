"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Home as HomeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import { ProductImage, categoryMeta, priceOf, type StoreProduct } from "./product-card";
import { useCustomerId } from "./use-customer-id";
import { formatMoney } from "@/lib/currency";

type CartItem = {
  id: string;
  quantity: number;
  product: StoreProduct;
};

type CartData = {
  id: string;
  items: CartItem[];
};

type CartResponse = { data?: CartData; error?: string };

export function CartView() {
  const customerId = useCustomerId();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/store/cart?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" });
      const json: CartResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setCart(json.data ?? null);
    } catch (e) {
      toast.error("Could not load cart", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateQty = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/store/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to update");
      }
      await refresh();
      window.dispatchEvent(new Event("playbeat-cart-updated"));
    } catch (e) {
      toast.error("Could not update quantity", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      const res = await fetch(`/api/store/cart/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to remove");
      }
      toast.success("Item removed");
      await refresh();
      window.dispatchEvent(new Event("playbeat-cart-updated"));
    } catch (e) {
      toast.error("Could not remove item", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const items = cart?.items ?? [];
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.product?.price ?? 0) * i.quantity, 0),
    [items]
  );

  const isEmpty = !loading && items.length === 0;

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground"><HomeIcon className="size-3" /> Home</Link>
          <span>/</span>
          <span className="text-foreground">Cart</span>
        </nav>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <ShoppingBag className="size-6 text-primary" />
              Your Cart
            </h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/products"><ArrowLeft className="size-4" /> Continue shopping</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-accent/20 p-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="size-7" />
            </div>
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse our catalog of gaming keys, AI tools, subscriptions and projectors.
            </p>
            <Button asChild size="lg" className="mt-6 premium-shadow">
              <Link href="/products">Shop Now <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* Line items */}
            <div className="space-y-3">
              {items.map((item) => {
                const meta = categoryMeta(item.product.category);
                const Icon = meta.icon;
                const lineTotal = Number(item.product?.price ?? 0) * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-xl border border-border/60 bg-card p-4 gradient-card"
                  >
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="size-20 shrink-0 overflow-hidden rounded-lg border border-border/60 sm:size-24"
                    >
                      <ProductImage product={item.product} />
                    </Link>

                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="line-clamp-2 text-sm font-semibold hover:text-primary"
                          >
                            {item.product.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="gap-1 text-[10px]">
                              <Icon className="size-3" /> {meta.label}
                            </Badge>
                            {item.product.digital && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
                                Digital
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={updatingId === item.id}
                          aria-label="Remove item"
                        >
                          {updatingId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </Button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border border-border/60">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-r-none"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingId === item.id}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-10 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-l-none"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            disabled={updatingId === item.id}
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatMoney(lineTotal, "PKR")}</p>
                          <p className="text-[11px] text-muted-foreground">{priceOf(item.product)} each</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-border/60 bg-card p-6 gradient-card premium-shadow">
                <h2 className="text-lg font-semibold">Order Summary</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatMoney(subtotal, "PKR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{formatMoney(0, "PKR")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-extrabold tracking-tight">{formatMoney(subtotal, "PKR")}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">All prices in Pakistani Rupees (₨).</p>
                  </div>
                </div>
                <Button asChild size="lg" className="mt-5 w-full premium-shadow">
                  <Link href="/checkout">Proceed to Checkout <ArrowRight className="size-4" /></Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
                  <Link href="/products">Continue shopping</Link>
                </Button>
                <p className="mt-4 text-center text-[11px] text-muted-foreground">
                  🔒 Secure checkout · Card · Easypaisa · Jazzcash · Crypto · Bank transfer
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
