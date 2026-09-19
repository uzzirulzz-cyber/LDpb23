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
  Lock,
  ShieldCheck,
  Zap,
} from "lucide-react";
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
type CartData = { id: string; items: CartItem[] };
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
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="flex items-center gap-1 hover:text-amber-300">
            <HomeIcon className="size-3" /> Home
          </Link>
          <span>/</span>
          <span className="text-slate-200">Cart</span>
        </nav>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <ShoppingBag className="size-6 text-amber-300" /> Your Cart
            </h1>
            <p className="text-sm text-slate-400">
              {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-amber-300"
          >
            <ArrowLeft className="size-4" /> Continue shopping
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-navy-panel h-28 animate-pulse" />
              ))}
            </div>
            <div className="glass-navy-panel h-64 animate-pulse" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
              <ShoppingBag className="size-7" />
            </div>
            <p className="text-lg font-semibold text-white">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-400">
              Browse our catalog of gaming keys, AI tools, subscriptions and projectors.
            </p>
            <Link
              href="/products"
              className="btn-gold-gradient mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold"
            >
              Shop Now <ArrowRight className="size-4" />
            </Link>
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
                    className="glass-navy-panel flex gap-4 p-4"
                  >
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="size-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:size-24"
                    >
                      <ProductImage product={item.product} />
                    </Link>

                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="line-clamp-2 text-sm font-semibold text-white transition-colors hover:text-amber-300"
                          >
                            {item.product.name}
                          </Link>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}
                            >
                              <Icon className="size-3" /> {meta.label}
                            </span>
                            {item.product.digital && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                                Digital
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                          onClick={() => removeItem(item.id)}
                          disabled={updatingId === item.id}
                          aria-label="Remove item"
                        >
                          {updatingId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]">
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-l-md text-slate-300 hover:bg-white/5 hover:text-amber-300 disabled:opacity-40"
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingId === item.id}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold tabular-nums text-white">
                            {item.quantity}
                          </span>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-r-md text-slate-300 hover:bg-white/5 hover:text-amber-300 disabled:opacity-50"
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            disabled={updatingId === item.id}
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-300">
                            {formatMoney(lineTotal, "PKR")}
                          </p>
                          <p className="text-[11px] text-slate-500">{priceOf(item.product)} each</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="glass-navy-panel p-6">
                <h2 className="text-lg font-semibold text-white">Order Summary</h2>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Subtotal" value={formatMoney(subtotal, "PKR")} />
                  <Row label="Tax" value={formatMoney(0, "PKR")} />
                  <Row label="Shipping" value={<span className="text-emerald-300">Free</span>} />
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-slate-200">Total</span>
                      <span className="text-2xl font-extrabold tracking-tight text-amber-300">
                        {formatMoney(subtotal, "PKR")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">All prices in Pakistani Rupees (₨).</p>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="btn-gold-gradient sheen-effect mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                >
                  Proceed to Checkout <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/products"
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-amber-300"
                >
                  Continue shopping
                </Link>
                <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Lock className="size-3" /> Secure</span>
                  <span className="flex items-center gap-1"><Zap className="size-3" /> Instant</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Verified</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}
