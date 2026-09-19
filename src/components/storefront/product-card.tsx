"use client";

import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  PlaySquare,
  Layers,
  Bot,
  Cloud,
  CreditCard,
  Projector,
  Headphones,
  ShieldCheck,
  Gift,
  Sparkles,
  Star,
  ShoppingCart,
  Zap,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
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
  createdAt?: string;
};

type CategoryMeta = {
  icon: LucideIcon;
  /** Tailwind classes for the category chip (bg + text + border). */
  chip: string;
  /** Tailwind gradient classes for the icon medallion. */
  medallion: string;
  /** Solid color used for accent text. */
  accent: string;
  label: string;
};

/**
 * CATEGORY_META — full izoko color system. Each category has a color-coded
 * chip (Streaming=rose, Subscriptions=emerald, Gift Cards=amber, Gaming=indigo,
 * Software=purple, Smart Projectors=cyan, SaaS=violet, AI Tools=sky,
 * Audio=orange, Security=teal, Projectors=cyan).
 */
export const CATEGORY_META: Record<string, CategoryMeta> = {
  Gaming: {
    icon: Gamepad2,
    chip: "bg-indigo-500/12 text-indigo-300 border-indigo-500/30",
    medallion: "from-indigo-500 to-indigo-700",
    accent: "text-indigo-300",
    label: "Gaming",
  },
  Streaming: {
    icon: PlaySquare,
    chip: "bg-rose-500/12 text-rose-300 border-rose-500/30",
    medallion: "from-rose-500 to-pink-600",
    accent: "text-rose-300",
    label: "Streaming",
  },
  Subscriptions: {
    icon: Layers,
    chip: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
    medallion: "from-emerald-500 to-teal-600",
    accent: "text-emerald-300",
    label: "Subscriptions",
  },
  "Gift Cards": {
    icon: Gift,
    chip: "bg-amber-500/12 text-amber-300 border-amber-500/30",
    medallion: "from-amber-400 to-orange-500",
    accent: "text-amber-300",
    label: "Gift Cards",
  },
  Software: {
    icon: CreditCard,
    chip: "bg-purple-500/12 text-purple-300 border-purple-500/30",
    medallion: "from-purple-500 to-fuchsia-600",
    accent: "text-purple-300",
    label: "Software",
  },
  "Smart Projectors": {
    icon: Projector,
    chip: "bg-cyan-500/12 text-cyan-300 border-cyan-500/30",
    medallion: "from-cyan-500 to-sky-600",
    accent: "text-cyan-300",
    label: "Smart Projectors",
  },
  SaaS: {
    icon: Cloud,
    chip: "bg-violet-500/12 text-violet-300 border-violet-500/30",
    medallion: "from-violet-500 to-purple-600",
    accent: "text-violet-300",
    label: "SaaS",
  },
  "AI Tools": {
    icon: Bot,
    chip: "bg-sky-500/12 text-sky-300 border-sky-500/30",
    medallion: "from-sky-500 to-blue-600",
    accent: "text-sky-300",
    label: "AI Tools",
  },
  Audio: {
    icon: Headphones,
    chip: "bg-orange-500/12 text-orange-300 border-orange-500/30",
    medallion: "from-orange-500 to-amber-600",
    accent: "text-orange-300",
    label: "Audio",
  },
  Security: {
    icon: ShieldCheck,
    chip: "bg-teal-500/12 text-teal-300 border-teal-500/30",
    medallion: "from-teal-500 to-emerald-600",
    accent: "text-teal-300",
    label: "Security",
  },
  Projectors: {
    icon: Projector,
    chip: "bg-cyan-500/12 text-cyan-300 border-cyan-500/30",
    medallion: "from-cyan-500 to-sky-600",
    accent: "text-cyan-300",
    label: "Projectors",
  },
};

export const FALLBACK_CATEGORIES = Object.keys(CATEGORY_META);

export function categoryMeta(cat: string): CategoryMeta {
  return (
    CATEGORY_META[cat] ?? {
      icon: Sparkles,
      chip: "bg-slate-500/12 text-slate-300 border-slate-500/30",
      medallion: "from-slate-500 to-slate-700",
      accent: "text-slate-300",
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

export function RatingStars({
  rating,
  className,
}: {
  rating?: number;
  className?: string;
}) {
  const r = Math.max(0, Math.min(5, Number(rating ?? 0)));
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`Rating ${r} of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < Math.round(r)
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-slate-600"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">{r.toFixed(1)}</span>
    </div>
  );
}

export function ProductImage({
  product,
  className,
}: {
  product: StoreProduct;
  className?: string;
}) {
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
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
        meta.medallion,
        className
      )}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0, transparent 50%)",
        }}
      />
      <Icon className="size-12 text-white/90 drop-shadow" />
    </div>
  );
}

/**
 * ProductCard — premium izoko dark navy card.
 * - rounded-[22px] with navy gradient + subtle white border + gold halo on hover
 * - aspect-[4/3] image, hover scale-105
 * - badges: INSTANT (emerald Zap) for digital, TRUCK (cyan) for physical
 * - color-coded category chip
 * - PKR price (amber-300), rating stars, full-width gold Add-to-Cart
 */
export function ProductCard({ product }: { product: StoreProduct }) {
  const [adding, setAdding] = useState(false);
  const meta = categoryMeta(product.category);
  const Icon = meta.icon;

  const onAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.07] bg-gradient-to-b from-[#0C1428] to-[#0A101F] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_45px_-12px_rgba(0,0,0,0.75),0_0_35px_-8px_rgba(250,204,21,0.28)]">
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block aspect-[4/3] overflow-hidden p-3">
        <div className="size-full overflow-hidden rounded-2xl ring-1 ring-white/5">
          <div className="size-full transition-transform duration-500 group-hover:scale-105">
            <ProductImage product={product} />
          </div>
        </div>
      </Link>

      {/* Badges top-left */}
      <div className="absolute left-5 top-5 flex flex-col gap-1.5">
        {product.digital ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30 backdrop-blur-sm">
            <Zap className="size-3" /> Instant
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300 ring-1 ring-cyan-500/30 backdrop-blur-sm">
            <Truck className="size-3" /> Truck
          </span>
        )}
      </div>

      {/* Category chip top-right */}
      <div className="absolute right-5 top-5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
            meta.chip
          )}
        >
          <Icon className="size-3" /> {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors hover:text-amber-300"
        >
          {product.name}
        </Link>
        <RatingStars rating={product.rating} />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-bold text-amber-300">
              {priceOf(product)}
            </p>
            <p className="text-[11px] text-slate-500">
              {product.digital ? "Instant delivery" : `Stock: ${product.stock}`}
            </p>
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={adding}
          className="btn-gold-gradient sheen-effect mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          <ShoppingCart className="size-4" />
          {adding ? "Adding…" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

/**
 * ProductCardSkeleton — dark navy shimmer placeholder.
 */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[22px] border border-white/[0.07] bg-gradient-to-b from-[#0C1428] to-[#0A101F]">
      <div className="m-3 aspect-[4/3] animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-auto pt-2">
          <div className="h-5 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-1 h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
        </div>
        <div className="mt-2 h-10 w-full animate-pulse rounded-lg bg-white/[0.05]" />
      </div>
    </div>
  );
}
