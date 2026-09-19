"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Headset,
  Lock,
  Sparkles,
  Store,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard,
  ProductCardSkeleton,
  type StoreProduct,
  CATEGORY_META,
  categoryMeta,
} from "./product-card";

type TrendingResponse = { data?: StoreProduct[]; error?: string };

const CATEGORIES = Object.keys(CATEGORY_META);

const FEATURES = [
  { icon: Zap, title: "Instant Delivery", desc: "License keys emailed in seconds." },
  { icon: ShieldCheck, title: "Verified Keys", desc: "Every key checked before delivery." },
  { icon: Headset, title: "24/7 Support", desc: "Real humans, any time zone." },
  { icon: Lock, title: "Secure Payments", desc: "Card, Easypaisa, Jazzcash, crypto." },
];

export function StorefrontHome() {
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/products?limit=8", { cache: "no-store" });
        const json: TrendingResponse = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setProducts(json.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setProducts([]);
          toast.error("Could not load products", {
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
  }, []);

  return (
    <StorefrontLayout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-accent/40 to-transparent" />
        <div className="absolute inset-0 -z-10 opacity-60" style={{
          backgroundImage: "radial-gradient(60% 60% at 50% 0%, oklch(0.62 0.20 256 / 0.18) 0%, transparent 70%)",
        }} />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Premium digital marketplace · PKR pricing
            </div>
            <div className="mb-6 flex items-center justify-center">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={72}
                height={72}
                className="rounded-2xl premium-shadow"
                priority
              />
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Instant <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Digital Delivery</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Gaming keys, subscriptions, AI tools &amp; smart projectors — playbeat.digital
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto premium-shadow">
                <Link href="/products">
                  Shop Now <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto glass">
                <Link href="/crm">
                  <LayoutDashboard className="size-4" /> Browse CRM
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Store className="size-3.5" />
              Trusted by gamers, founders &amp; creators across PK
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORY CARDS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Shop by Category</h2>
            <p className="text-sm text-muted-foreground">Find exactly what you need.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => {
            const meta = categoryMeta(cat);
            const Icon = meta.icon;
            return (
              <Link
                key={cat}
                href={`/products?category=${encodeURIComponent(cat)}`}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 gradient-card premium-shadow"
              >
                <div className={`mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient} text-white shadow`}>
                  <Icon className="size-5" />
                </div>
                <p className="text-sm font-semibold">{meta.label}</p>
                <p className="text-[11px] text-muted-foreground">Shop now →</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ TRENDING PRODUCTS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trending Now</h2>
            <p className="text-sm text-muted-foreground">Fresh inventory delivered instantly.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/products">View all <ArrowRight className="size-4" /></Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-accent/20 p-12 text-center">
            <p className="text-sm text-muted-foreground">No products available yet. Check back soon.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/products">Browse all products</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ============ FEATURES STRIP ============ */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-5 gradient-card premium-shadow"
              >
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ CTA STRIP ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-primary-foreground sm:p-12 premium-shadow">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0, transparent 50%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Ready to power up?</h2>
              <p className="mt-1 text-primary-foreground/80">Verified keys, instant delivery, premium support — all in PKR.</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link href="/products">Start shopping <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </StorefrontLayout>
  );
}
