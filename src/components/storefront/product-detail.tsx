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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Related products (same category, limit 4)
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
        // ignore — related is best-effort
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

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground"><HomeIcon className="size-3" /> Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground">Products</Link>
          {product && (
            <>
              <span>/</span>
              <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground">
                {categoryMeta(product.category).label}
              </Link>
              <span>/</span>
              <span className="truncate text-foreground">{product.name}</span>
            </>
          )}
        </nav>

        <Button asChild variant="ghost" size="sm" className="mb-5">
          <Link href="/products"><ArrowLeft className="size-4" /> Back to products</Link>
        </Button>

        {loading ? (
          <DetailSkeleton />
        ) : notFound || !product ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-accent/20 p-12 text-center">
            <p className="text-lg font-semibold">Product not found</p>
            <p className="mt-1 text-sm text-muted-foreground">This item may have been removed or is no longer available.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Browse all products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* LEFT: image gallery */}
              <div className="space-y-3">
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-card gradient-card premium-shadow">
                  {imageList.length > 0 ? (
                     
                    <img
                      src={imageList[activeImage] ?? imageList[0]}
                      alt={product.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ProductImage product={product} />
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge variant="secondary" className="glass border-border/60">
                      {categoryMeta(product.category).label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`glass border-border/60 ${
                        product.digital
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {product.digital ? "Digital" : "Physical"}
                    </Badge>
                  </div>
                </div>
                {imageList.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {imageList.slice(0, 5).map((src, i) => (
                      <button
                        key={src + i}
                        onClick={() => setActiveImage(i)}
                        className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                          i === activeImage ? "border-primary" : "border-border/60 hover:border-primary/50"
                        }`}
                      >
                        { }
                        <img src={src} alt={`${product.name} ${i + 1}`} className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: details */}
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
                  <div className="mt-2 flex items-center gap-3">
                    <RatingStars rating={product.rating} />
                    {product.subcategory && (
                      <span className="text-xs text-muted-foreground">· {product.subcategory}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <p className="text-3xl font-extrabold tracking-tight">{priceOf(product)}</p>
                  <span className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    {product.digital ? "∞ Digital · Instant delivery" : `In stock: ${product.stock}`}
                  </span>
                </div>

                {product.deliveryType && (
                  <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
                    <Zap className="size-3.5" /> {product.deliveryType}
                  </Badge>
                )}

                {product.description && (
                  <div className="prose prose-sm max-w-none text-sm text-muted-foreground">
                    <p className="whitespace-pre-line">{product.description}</p>
                  </div>
                )}

                {/* Quantity selector */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Quantity</label>
                  <div className="flex items-center rounded-lg border border-border/60">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-r-none"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-12 text-center text-sm font-semibold tabular-nums">{qty}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-l-none"
                      onClick={() => setQty((q) => q + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 premium-shadow"
                    onClick={onAdd}
                    disabled={adding}
                  >
                    {adding ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                    {adding ? "Adding…" : "Add to Cart"}
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 premium-shadow"
                    onClick={onBuyNow}
                    disabled={buying}
                  >
                    {buying ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    {buying ? "Redirecting…" : "Buy Now"}
                  </Button>
                </div>

                {/* Trust strip */}
                <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-5">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Zap className="size-5 text-primary" />
                    <p className="text-[11px] font-medium">Instant</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <ShieldCheck className="size-5 text-primary" />
                    <p className="text-[11px] font-medium">Verified</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <CheckCircle2 className="size-5 text-primary" />
                    <p className="text-[11px] font-medium">Guaranteed</p>
                  </div>
                </div>

                {/* SKU */}
                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
              </div>
            </div>

            {/* ============ RELATED ============ */}
            {related.length > 0 && (
              <section className="mt-16">
                <h2 className="mb-5 text-xl font-bold tracking-tight">Related products</h2>
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

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
