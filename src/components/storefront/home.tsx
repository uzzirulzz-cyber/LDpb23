"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight, Zap, ShieldCheck, Headset, Lock, Sparkles, Store,
  LayoutDashboard, Check, Star, ChevronDown, Gift, Clock, BadgeCheck,
  Gamepad2, Bot, Tv, Cloud, Headphones, CreditCard, Users, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard, ProductCardSkeleton, type StoreProduct, CATEGORY_META, categoryMeta,
} from "./product-card";

type TrendingResponse = { data?: StoreProduct[]; error?: string };
const CATEGORIES = Object.keys(CATEGORY_META);

const FEATURES = [
  { icon: Zap, title: "Instant Delivery", desc: "License keys emailed in seconds — 24/7, automated." },
  { icon: ShieldCheck, title: "Verified Keys", desc: "Every key checked & guaranteed before delivery." },
  { icon: Headset, title: "24/7 Support", desc: "Real humans, any time zone, WhatsApp & email." },
  { icon: Lock, title: "Secure Payments", desc: "Card, Easypaisa, Jazzcash, crypto — all protected." },
];

const STATS = [
  { value: "50K+", label: "Keys delivered", icon: Gift },
  { value: "4.9/5", label: "Customer rating", icon: Star },
  { value: "<30s", label: "Avg. delivery time", icon: Clock },
  { value: "99.9%", label: "Uptime", icon: TrendingUp },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse & choose", desc: "Pick from gaming keys, subscriptions, AI tools, SaaS licenses & smart projectors.", icon: Store },
  { step: "02", title: "Secure checkout", desc: "Pay with card, Easypaisa, Jazzcash or crypto. PKR pricing, no hidden fees.", icon: CreditCard },
  { step: "03", title: "Instant delivery", desc: "Digital keys are auto-emailed in seconds. Hardware ships in 2–5 days.", icon: Zap },
  { step: "04", title: "Activate & enjoy", desc: "Redeem your key, track orders in your account, get support anytime.", icon: BadgeCheck },
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

export function StorefrontHome() {
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
          toast.error("Could not load products", { description: e instanceof Error ? e.message : "Unknown error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <StorefrontLayout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-accent/40 to-transparent" />
        <div className="absolute inset-0 -z-10 opacity-60" style={{ backgroundImage: "radial-gradient(60% 60% at 50% 0%, oklch(0.62 0.20 256 / 0.18) 0%, transparent 70%)" }} />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Premium digital marketplace · PKR pricing
            </div>
            <div className="mb-6 flex items-center justify-center">
              <Image src="/playbeat-logo.png" alt="Playbeat" width={72} height={72} className="rounded-2xl premium-shadow" priority />
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Instant <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">Digital Delivery</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Gaming keys, subscriptions, AI tools, SaaS licenses &amp; smart projectors — playbeat.digital
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto premium-shadow">
                <Link href="/products">Shop Now <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto glass">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Store className="size-3.5" /> Trusted across PK · UAE · KSA</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-500" /> Verified keys</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-amber-500" /> &lt;30s delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ FEATURES STRIP ============ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why playbeat.digital?</h2>
          <p className="mt-2 text-sm text-muted-foreground">The premium digital marketplace built for speed, trust &amp; value.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border/60 bg-card p-5 gradient-card premium-shadow">
                <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-2 text-sm text-muted-foreground">From browse to activate in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute -right-3 top-8 hidden z-10 lg:block">
                      <ArrowRight className="size-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="rounded-xl border border-border/60 bg-card p-5 h-full gradient-card">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-2xl font-extrabold text-muted-foreground/30">{s.step}</span>
                    </div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ CATEGORY CARDS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
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
              <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 gradient-card premium-shadow">
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
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-accent/20 p-12 text-center">
            <p className="text-sm text-muted-foreground">No products available yet. Check back soon.</p>
            <Button asChild variant="outline" className="mt-4"><Link href="/products">Browse all products</Link></Button>
          </div>
        )}
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Simple, transparent pricing</h2>
            <p className="mt-2 text-sm text-muted-foreground">PKR pricing for everyone. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRICING.map((tier) => (
              <div key={tier.name} className={`relative rounded-2xl border p-6 premium-shadow ${tier.popular ? "border-primary bg-card gradient-card ring-2 ring-primary/30" : "border-border/60 bg-card"}`}>
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold text-muted-foreground">{tier.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tier.desc}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <Button asChild className="mt-5 w-full" variant={tier.popular ? "default" : "outline"}>
                  <Link href={tier.href}>{tier.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Loved by gamers, founders &amp; creators</h2>
          <p className="mt-2 text-sm text-muted-foreground">Real reviews from real Playbeat customers.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-xl border border-border/60 bg-card p-5 gradient-card premium-shadow">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
            <p className="mt-2 text-sm text-muted-foreground">Everything you need to know about playbeat.digital.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="text-sm font-semibold">{faq.q}</span>
                  <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NEWSLETTER + CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-primary-foreground premium-shadow sm:p-12">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0, transparent 50%)" }} />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold sm:text-3xl">Get 10% off your first order</h2>
              <p className="mt-1 text-primary-foreground/80">Join the Playbeat newsletter for exclusive drops, deals &amp; restock alerts. PKR pricing, always.</p>
              <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); toast.success("Subscribed!", { description: "Your 10% code is on its way." }); }}>
                <input
                  type="email" required placeholder="you@email.com"
                  className="h-10 w-full rounded-lg border-0 bg-white/15 px-4 text-sm text-white placeholder:text-white/60 outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-white/40 sm:max-w-xs"
                />
                <Button type="submit" size="lg" variant="secondary" className="shrink-0">Subscribe</Button>
              </form>
            </div>
            <div className="hidden shrink-0 sm:block">
              <Image src="/playbeat-logo.png" alt="Playbeat" width={120} height={120} className="rounded-2xl opacity-90" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ ADMIN CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-card p-8 gradient-card text-center">
          <LayoutDashboard className="mx-auto mb-3 size-8 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Operating Playbeat.digital?</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The full CRM &amp; admin control center — leads, funnels, waterfall engine, workflows, bots, orders &amp; analytics.
          </p>
          <Button asChild className="mt-5" size="lg">
            <Link href="/admin">Open Admin Panel <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>
    </StorefrontLayout>
  );
}
