"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight, Zap, ShieldCheck, Headset, Lock, Store,
  LayoutDashboard, Check, Star, ChevronDown, Clock, BadgeCheck,
  Projector, Layers, CreditCard, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard, ProductCardSkeleton, type StoreProduct, categoryMeta,
} from "./product-card";

type TrendingResponse = { data?: StoreProduct[]; count?: number; error?: string };

const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "Gaming", label: "Gaming" },
  { key: "Streaming", label: "Streaming" },
  { key: "Subscriptions", label: "Subscriptions" },
  { key: "AI Tools", label: "AI Tools" },
  { key: "Projectors", label: "Projectors" },
  { key: "Audio", label: "Audio" },
];

const FEATURES = [
  { icon: Zap, title: "Instant Delivery", desc: "License keys emailed in seconds — 24/7, automated." },
  { icon: ShieldCheck, title: "Verified Keys", desc: "Every key checked & guaranteed before delivery." },
  { icon: Headset, title: "24/7 Support", desc: "Real humans, any time zone, WhatsApp & email." },
  { icon: Lock, title: "Secure Payments", desc: "Card, Easypaisa, Jazzcash, crypto — all protected." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse", desc: "Pick from gaming keys, subscriptions, AI tools, SaaS licenses & smart projectors.", icon: Store },
  { step: "02", title: "Checkout", desc: "Pay with card, Easypaisa, Jazzcash or crypto. PKR pricing, no hidden fees.", icon: CreditCard },
  { step: "03", title: "Delivery", desc: "Digital keys auto-emailed in seconds. Hardware ships in 2–5 days.", icon: Zap },
  { step: "04", title: "Activate", desc: "Redeem your key, track orders in your account, get support anytime.", icon: BadgeCheck },
];

const PRICING = [
  {
    name: "Starter", price: "Free", period: "forever", desc: "For first-time shoppers",
    features: ["Browse full catalog", "PKR pricing", "Instant digital delivery", "Email support", "Order history"],
    cta: "Start shopping", href: "/products", popular: false,
  },
  {
    name: "Pro Buyer", price: "₨ 1,000", period: "/month", desc: "For regular digital buyers",
    features: ["Everything in Starter", "Priority instant delivery", "5% off all digital keys", "WhatsApp priority support", "Early access to drops", "Price-drop alerts"],
    cta: "Go Pro", href: "/account", popular: true,
  },
  {
    name: "Business", price: "Custom", period: "", desc: "For teams & resellers",
    features: ["Everything in Pro", "Bulk licensing", "Dedicated account manager", "Net-30 invoicing", "Custom integrations", "Volume discounts"],
    cta: "Contact sales", href: "/contact", popular: false,
  },
];

const TESTIMONIALS = [
  { name: "Ahmed Raza", role: "Gamer · Lahore", rating: 5, text: "Got my Steam Wallet code in 15 seconds. PKR pricing is a game changer — no more forex hassle." },
  { name: "Sara Malik", role: "Founder · Dubai", rating: 5, text: "We buy all our team's SaaS licenses through playbeat.digital. Bulk invoicing saves us hours every month." },
  { name: "Bilal Khan", role: "Streamer · Karachi", rating: 5, text: "ChatGPT Plus, Netflix, Spotify — all in one place, all instant. Support actually replies on WhatsApp." },
  { name: "Hira Sheikh", role: "Agency Owner · Islamabad", rating: 5, text: "The PlayBeat Pro projector is genuinely premium. Delivery in 3 days, setup was instant. Highly recommend." },
];

const FAQS = [
  { q: "How fast is digital delivery?", a: "Digital license keys are generated and emailed automatically within seconds of a successful payment — 24/7, including weekends and holidays." },
  { q: "Are the keys genuine and verified?", a: "Yes. Every key is sourced from authorized distributors and verified by our system before delivery. If a key ever fails, we replace it free of charge." },
  { q: "What payment methods do you accept?", a: "We accept credit/debit cards, Easypaisa, JazzCash, bank transfer, and cryptocurrency. All prices are in PKR by default with multi-currency support (USD, EUR, GBP, AED, SAR)." },
  { q: "Do you ship hardware internationally?", a: "Smart projectors and audio gear ship across Pakistan (2–5 business days) and to UAE/Saudi Arabia (5–10 business days). Digital products are delivered globally via email." },
  { q: "Can I get a refund?", a: "Digital keys are non-refundable once delivered (they're one-time-use licenses). Hardware follows a 7-day return policy for defective units. Pro Buyer subscribers get price protection." },
  { q: "Do you offer business / bulk pricing?", a: "Yes — our Business plan includes bulk licensing, net-30 invoicing, volume discounts, and a dedicated account manager. Contact sales via the Contact page." },
];

const PROJECTOR_SPECS = [
  { label: "Brightness", value: "2500 ANSI Lumens" },
  { label: "Resolution", value: "True 4K UHD" },
  { label: "Lamp Life", value: "30,000 hrs" },
  { label: "Connectivity", value: "Wi-Fi 6 · BT 5.2 · HDMI 2.1" },
];

export function StorefrontHome() {
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 3;

    const loadProducts = async () => {
      try {
        const res = await fetch("/api/store/products?limit=8", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TrendingResponse = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setProducts(json.data ?? []);
      } catch (e) {
        if (cancelled) return;
        retryCount++;
        if (retryCount < maxRetries) {
          // Retry after 1s, 2s, 4s
          setTimeout(loadProducts, 1000 * retryCount);
          return;
        }
        setProducts([]);
        toast.error("Could not load products", { description: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        if (!cancelled && retryCount >= maxRetries) setLoading(false);
        else if (!cancelled) {
          // Set loading false once we have products or exhausted retries
          if (retryCount === 0) setLoading(false);
        }
      }
    };
    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const productCount = products?.length ?? 0;
  const categoryCount = CATEGORIES.length;
  const liveStats = [
    { value: loading ? "—" : `${productCount}+`, label: "Live products", icon: Store },
    { value: `${categoryCount}`, label: "Categories", icon: Layers },
    { value: "100%", label: "Genuine keys", icon: ShieldCheck },
    { value: "<30s", label: "Avg. delivery", icon: Clock },
  ];
  const projectorProduct = (products ?? []).find(
    (p) => p.category === "Projectors" || p.category === "Smart Projectors"
  );

  return (
    <StorefrontLayout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        {/* Landing background image */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url(/landing-bg.jpg)" }}
        />
        {/* Dark overlay for text readability */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#050814]/80 via-[#050814]/70 to-[#050814]"
        />
        {/* Aurora blobs */}
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -left-32 -top-32 -z-10 size-[480px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -right-40 top-10 -z-10 size-[520px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(250, 204, 21, 0.28) 0%, transparent 65%)", animationDelay: "1.5s" }}
        />
        {/* Grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 75%)",
          }}
        />

        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-4 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
              <span className="pulse-dot size-1.5 rounded-full bg-emerald-400" />
              Pakistan&apos;s Premium Digital Marketplace
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your Digital World.
              <br />
              <span className="text-gold-gradient">One Marketplace.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-slate-300 sm:text-lg">
              Gaming keys, subscriptions, AI tools, SaaS licenses &amp; smart
              projectors — instant delivery, verified keys, PKR pricing.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                className="btn-gold-gradient sheen-effect inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
              >
                Explore Products <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/products?category=Subscriptions"
                className="btn-silver-metallic inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
              >
                <Layers className="size-4" /> View Subscriptions
              </Link>
            </div>

            {/* Live stats strip */}
            <div className="mt-12 grid grid-cols-2 gap-3 rounded-2xl border border-white/[0.07] bg-[#0A101F]/60 p-4 backdrop-blur-md sm:grid-cols-4">
              {liveStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-3 px-2">
                    <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                      <Icon className="size-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-extrabold tracking-tight text-white">{s.value}</p>
                      <p className="text-[11px] text-slate-400">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORY CARDS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-slate-400">Find exactly what you need.</p>
          </div>
          <Link
            href="/products"
            className="hidden text-sm font-medium text-amber-300 hover:text-amber-200 sm:inline-flex sm:items-center sm:gap-1"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((cat) => {
            const meta = categoryMeta(cat.key);
            const Icon = meta.icon;
            return (
              <Link
                key={cat.key}
                href={`/products?category=${encodeURIComponent(cat.key)}`}
                className="glass-navy-card sheen-effect group flex flex-col items-start gap-3 p-5"
              >
                <div
                  className={`inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.medallion} text-white shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-110`}
                >
                  <Icon className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Shop now →</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============ TRENDING PRODUCTS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <TrendingUp className="size-6 text-amber-300" /> Trending Now
            </h2>
            <p className="mt-1 text-sm text-slate-400">Fresh inventory delivered instantly.</p>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-amber-300 hover:text-amber-200"
          >
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-sm text-slate-400">No products available yet. Check back soon.</p>
            <Link
              href="/products"
              className="btn-silver-metallic mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Browse all products
            </Link>
          </div>
        )}
      </section>

      {/* ============ FEATURES STRIP ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Why playbeat.digital?
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              The premium digital marketplace built for speed, trust &amp; value.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass-navy-card p-5">
                  <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PROJECTOR SHOWCASE ============ */}
      {projectorProduct && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px] border border-amber-400/20 bg-gradient-to-br from-[#0C1428] via-[#0A101F] to-[#050814] p-8 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full opacity-40"
              style={{ background: "radial-gradient(circle, rgba(250, 204, 21, 0.35) 0%, transparent 60%)" }}
            />
            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  <Projector className="size-3.5" /> Featured Hardware
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  PlayBeat Pro 4K Projector
                </h2>
                <p className="mt-3 max-w-md text-sm text-slate-300">
                  True 4K UHD. 2500 ANSI lumens. Cinematic color. Smart OS with
                  built-in Netflix, Prime &amp; YouTube. Engineered for the
                  premium home theater.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {PROJECTOR_SPECS.map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/products/${projectorProduct.slug}`}
                    className="btn-gold-gradient inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold"
                  >
                    View Projector <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/products?category=Projectors"
                    className="btn-silver-metallic inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold"
                  >
                    Browse all
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/15 to-cyan-500/10">
                  { }
                  <img
                    src={(projectorProduct.images?.[0] as string) || "/playbeat-logo.png"}
                    alt={projectorProduct.name}
                    className="size-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 rounded-2xl border border-amber-400/40 bg-[#0A101F] px-5 py-3 shadow-xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">From</p>
                  <p className="text-2xl font-extrabold text-amber-300">
                    {new Intl.NumberFormat("en-US").format(Math.round(Number(projectorProduct.price)))} ₨
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">How it works</h2>
            <p className="mt-2 text-sm text-slate-400">From browse to activate in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute -right-3 top-8 hidden z-10 lg:block">
                      <ArrowRight className="size-4 text-amber-400/40" />
                    </div>
                  )}
                  <div className="glass-navy-card h-full p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-2xl font-extrabold text-white/15">{s.step}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PRICING TEASER ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-sm text-slate-400">PKR pricing for everyone. Upgrade when you need more.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PRICING.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl p-6 transition-all ${
                tier.popular
                  ? "glass-navy-card ring-2 ring-amber-400/50"
                  : "border border-white/[0.07] bg-gradient-to-b from-[#0C1428] to-[#0A101F]"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#070B19]">
                  Most popular
                </span>
              )}
              <p className="text-sm font-semibold text-slate-300">{tier.name}</p>
              <p className="mt-1 text-xs text-slate-500">{tier.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-white">{tier.price}</span>
                <span className="text-sm text-slate-400">{tier.period}</span>
              </div>
              <Link
                href={tier.href}
                className={
                  tier.popular
                    ? "btn-gold-gradient mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                    : "btn-silver-metallic mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                }
              >
                {tier.cta}
              </Link>
              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Loved by gamers, founders &amp; creators
            </h2>
            <p className="mt-2 text-sm text-slate-400">Real reviews from real Playbeat customers.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-navy-card p-5">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-amber-400/15 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-slate-400">Everything you need to know about playbeat.digital.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#0C1428] to-[#0A101F]"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-sm font-semibold text-white">{faq.q}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-amber-300 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-slate-400">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ============ NEWSLETTER CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 p-8 text-[#070B19] sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6) 0, transparent 50%)",
            }}
          />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold sm:text-3xl">Get 10% off your first order</h2>
              <p className="mt-1 text-[#070B19]/80">
                Join the Playbeat newsletter for exclusive drops, deals &amp; restock alerts. PKR pricing, always.
              </p>
              <form
                className="mt-5 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success("Subscribed!", { description: "Your 10% code is on its way." });
                  (e.currentTarget as HTMLFormElement).reset();
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="h-11 w-full rounded-lg border-0 bg-[#070B19]/10 px-4 text-sm text-[#070B19] placeholder:text-[#070B19]/60 outline-none ring-1 ring-[#070B19]/20 focus:ring-2 focus:ring-[#070B19]/40 sm:max-w-xs"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#070B19] px-5 text-sm font-semibold text-amber-300 transition-colors hover:bg-[#070B19]/90"
                >
                  Subscribe <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={120}
                height={120}
                className="rounded-2xl ring-2 ring-[#070B19]/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ ADMIN CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="glass-navy-card p-8 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
            <LayoutDashboard className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Operating Playbeat.digital?
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            The full CRM &amp; admin control center — leads, funnels, waterfall
            engine, workflows, bots, orders &amp; analytics.
          </p>
          <Link
            href="/admin"
            className="btn-gold-gradient mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold"
          >
            Open Admin Panel <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </StorefrontLayout>
  );
}
