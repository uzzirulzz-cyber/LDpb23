"use client";

import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  Tv,
  Brain,
  Boxes,
  Projector,
  Headphones,
  Sparkles,
  Star,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney, isCurrency, type Currency } from "@/lib/currency";
import { getCustomerId } from "./use-customer-id";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  subcategory?: string | null;
  price: number;
  currency?: string;
  digital: boolean;
  deliveryType?: string;
  stock: number;
  description?: string;
  images?: unknown[];
  rating?: number;
  active?: boolean;
};

export const CATEGORY_META: Record<
  string,
  { icon: LucideIcon; gradient: string; label: string }
> = {
  Gaming: { icon: Gamepad2, gradient: "from-blue-500 to-indigo-600", label: "Gaming" },
  Streaming: { icon: Tv, gradient: "from-rose-500 to-pink-600", label: "Streaming" },
  "AI Tools": { icon: Brain, gradient: "from-violet-500 to-purple-600", label: "AI Tools" },
  SaaS: { icon: Boxes, gradient: "from-emerald-500 to-teal-600", label: "SaaS" },
  Projectors: { icon: Projector, gradient: "from-amber-500 to-orange-600", label: "Projectors" },
  Audio: { icon: Headphones, gradient: "from-cyan-500 to-sky-600", label: "Audio" },
};

export const FALLBACK_CATEGORIES = ["Gaming", "Streaming", "AI Tools", "SaaS", "Projectors", "Audio"];

export function categoryMeta(cat: string): { icon: LucideIcon; gradient: string; label: string } {
  return (
    CATEGORY_META[cat] ?? {
      icon: Sparkles,
      gradient: "from-slate-500 to-slate-700",
      label: cat,
    }
  );
}

export function resolveImage(product: StoreProduct): string | null {
  const imgs = product.images;
  if (Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === "string") {
    return imgs[0] as string;
  }
  return null;
}

export function priceOf(product: StoreProduct): string {
  const cur = isCurrency(product.currency ?? "PKR") ? (product.currency as Currency) : "PKR";
  return formatMoney(Number(product.price ?? 0), cur);
}

export function RatingStars({ rating, className }: { rating?: number; className?: string }) {
  const r = Math.max(0, Math.min(5, Number(rating ?? 0)));
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rating ${r} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < Math.round(r) ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{r.toFixed(1)}</span>
    </div>
  );
}

export function ProductImage({ product, className }: { product: StoreProduct; className?: string }) {
  const src = resolveImage(product);
  const meta = categoryMeta(product.category);
  const Icon = meta.icon;
  if (src) {
    return (
       
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center bg-gradient-to-br overflow-hidden", meta.gradient, className)}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0, transparent 50%)" }} />
      <Icon className="size-12 text-white/90 drop-shadow" />
    </div>
  );
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const [adding, setAdding] = useState(false);
  const meta = categoryMeta(product.category);

  const onAdd = async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      toast.error("Unable to access local storage. Please enable cookies.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/store/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, productId: product.id, quantity: 1 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Failed to add to cart");
      }
      toast.success("Added to cart", { description: product.name });
      window.dispatchEvent(new Event("playbeat-cart-updated"));
    } catch (e) {
      toast.error("Could not add to cart", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card gradient-card premium-shadow transition-all hover:-translate-y-0.5">
      <Link href={`/products/${product.slug}`} className="block aspect-[4/3] overflow-hidden">
        <div className="size-full transition-transform duration-300 group-hover:scale-105">
          <ProductImage product={product} />
        </div>
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary" className="glass border-border/60 font-medium">
            <meta.icon className="size-3" /> {meta.label}
          </Badge>
          {product.digital && (
            <Badge variant="outline" className="glass border-border/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Digital
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary transition-colors">
          {product.name}
        </Link>
        <RatingStars rating={product.rating} />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-bold tracking-tight">{priceOf(product)}</p>
            <p className="text-[11px] text-muted-foreground">{product.digital ? "Instant delivery" : `Stock: ${product.stock}`}</p>
          </div>
          <Button size="sm" onClick={onAdd} disabled={adding} className="shrink-0">
            <ShoppingCart className="size-4" />
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-auto flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
