"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Home as HomeIcon,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard,
  ProductImage,
  RatingStars,
  categoryMeta,
  priceOf,
  type StoreProduct,
} from "./product-card";
import { getCustomerId } from "./use-customer-id";

type ProductResponse = { data?: StoreProduct; error?: string };
type RelatedResponse = { data?: StoreProduct[]; error?: string };

export function ProductDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setRelated([]);
    setActiveImage(0);
    setQty(1);
    (async () => {
      try {
        const res = await fetch(`/api/store/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json: ProductResponse = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setProduct(json.data ?? null);
      } catch (e) {
        if (!cancelled) {
          toast.error("Could not load product", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/store/products?category=${encodeURIComponent(product.category)}&limit=8`,
          { cache: "no-store" }
        );
        const json: RelatedResponse = await res.json();
        if (cancelled) return;
        const list = (json.data ?? []).filter((p) => p.id !== product.id).slice(0, 4);
        setRelated(list);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  const imageList = useMemo<string[]>(() => {
    if (!product) return [];
    const imgs = product.images;
    if (Array.isArray(imgs)) {
      return imgs.filter((u): u is string => typeof u === "string" && u.length > 0);
    }
    return [];
  }, [product]);

  const addToCart = async (quantity: number): Promise<boolean> => {
    if (!product) return false;
    const customerId = getCustomerId();
    if (!customerId) {
      toast.error("Unable to access local storage. Please enable cookies.");
      return false;
    }
    try {
      const res = await fetch("/api/store/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, productId: product.id, quantity }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to add to cart");
      }
      window.dispatchEvent(new Event("playbeat-cart-updated"));
      return true;
    } catch (e) {
      toast.error("Could not add to cart", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      return false;
    }
  };

  const onAdd = async () => {
    setAdding(true);
    const ok = await addToCart(qty);
    if (ok) toast.success("Added to cart", { description: `${qty} × ${product?.name}` });
    setAdding(false);
  };

  const onBuyNow = async () => {
    setBuying(true);
    const ok = await addToCart(qty);
    if (ok) {
      toast.success("Proceeding to checkout…");
      router.push("/checkout");
    }
    setBuying(false);
  };

  const meta = product ? categoryMeta(product.category) : null;

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="flex items-center gap-1 hover:text-amber-300">
            <HomeIcon className="size-3" /> Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-amber-300">Products</Link>
          {product && meta && (
            <>
              <span>/</span>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="hover:text-amber-300"
              >
                {meta.label}
              </Link>
              <span>/</span>
              <span className="truncate text-slate-200">{product.name}</span>
            </>
          )}
        </nav>

        <Link
          href="/products"
          className="mb-5 inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-amber-300"
        >
          <ArrowLeft className="size-4" /> Back to products
        </Link>

        {loading ? (
          <DetailSkeleton />
        ) : notFound || !product || !meta ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-lg font-semibold text-white">Product not found</p>
            <p className="mt-1 text-sm text-slate-400">
              This item may have been removed or is no longer available.
            </p>
            <Link
              href="/products"
              className="btn-gold-gradient mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* LEFT: image gallery */}
              <div className="space-y-3">
                <div className="glass-navy-card relative aspect-square overflow-hidden p-3">
                  {imageList.length > 0 ? (
                     
                    <img
                      src={imageList[activeImage] ?? imageList[0]}
                      alt={product.name}
                      className="size-full rounded-xl object-cover"
                    />
                  ) : (
                    <ProductImage product={product} className="rounded-xl" />
                  )}
                  <div className="absolute left-5 top-5 flex flex-col gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${meta.chip}`}
                    >
                      <meta.icon className="size-3" /> {meta.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${
                        product.digital
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                          : "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                      }`}
                    >
                      {product.digital ? (
                        <>
                          <Zap className="size-3" /> Digital
                        </>
                      ) : (
                        <>
                          <Truck className="size-3" /> Physical
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {imageList.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {imageList.slice(0, 5).map((src, i) => (
                      <button
                        key={src + i}
                        onClick={() => setActiveImage(i)}
                        className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                          i === activeImage
                            ? "border-amber-400"
                            : "border-white/10 hover:border-amber-400/50"
                        }`}
                      >
                        { }
                        <img
                          src={src}
                          alt={`${product.name} ${i + 1}`}
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: details */}
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {product.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-3">
                    <RatingStars rating={product.rating} />
                    {product.subcategory && (
                      <span className="text-xs text-slate-400">· {product.subcategory}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <p className="text-3xl font-extrabold tracking-tight text-amber-300">
                    {priceOf(product)}
                  </p>
                  <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="size-3.5" />
                    {product.digital ? "∞ Digital · Instant delivery" : `In stock: ${product.stock}`}
                  </span>
                </div>

                {product.deliveryType && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-3 py-1 text-xs font-medium text-amber-300">
                    <Zap className="size-3.5" /> {product.deliveryType}
                  </span>
                )}

                {product.description && (
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm leading-relaxed text-slate-300">
                    <p className="whitespace-pre-line">{product.description}</p>
                  </div>
                )}

                {/* Quantity selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-300">Quantity</label>
                  <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]">
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-l-md text-slate-300 hover:bg-white/5 hover:text-amber-300 disabled:opacity-40"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-semibold tabular-nums text-white">
                      {qty}
                    </span>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-r-md text-slate-300 hover:bg-white/5 hover:text-amber-300"
                      onClick={() => setQty((q) => q + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={onAdd}
                    disabled={adding}
                    className="btn-gold-gradient sheen-effect inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {adding ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                    {adding ? "Adding…" : "Add to Cart"}
                  </button>
                  <button
                    onClick={onBuyNow}
                    disabled={buying}
                    className="btn-silver-metallic inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {buying ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    {buying ? "Redirecting…" : "Buy Now"}
                  </button>
                </div>

                {/* Trust strip */}
                <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
                  <Trust icon={<Zap className="size-5" />} label="Instant" />
                  <Trust icon={<ShieldCheck className="size-5" />} label="Verified" />
                  <Trust icon={<CheckCircle2 className="size-5" />} label="Guaranteed" />
                </div>

                <p className="text-xs text-slate-500">SKU: {product.sku}</p>
              </div>
            </div>

            {/* ============ RELATED ============ */}
            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="mb-5 text-xl font-bold tracking-tight text-white">
                  Related products
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {related.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </StorefrontLayout>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-amber-300">{icon}</span>
      <p className="text-[11px] font-medium text-slate-300">{label}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="glass-navy-card aspect-square animate-pulse" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-10 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-24 w-full animate-pulse rounded bg-white/[0.04]" />
        <div className="h-12 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="h-12 w-full animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}
