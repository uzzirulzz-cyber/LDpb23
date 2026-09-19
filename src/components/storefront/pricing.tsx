"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Sparkles, Check, X, ChevronDown, Zap, ShieldCheck,
  Headset, Lock, Store, CreditCard, BadgeCheck, Headphones, Gift,
  Clock, TrendingUp, FileText, Plug, Users, BarChart3, Crown,
} from "lucide-react";
import { StorefrontLayout } from "./layout";

type Cell = boolean | string;
type TierKey = "starter" | "pro" | "business";

const TIERS: Array<{
  key: TierKey;
  name: string;
  price: string;
  period: string;
  desc: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  popular: boolean;
  icon: typeof Zap;
}> = [
  {
    key: "starter",
    name: "Starter",
    price: "Free",
    period: "forever",
    desc: "For first-time shoppers exploring the catalog.",
    tagline: "Everything you need to buy with confidence.",
    features: [
      "Browse the full digital catalog",
      "PKR pricing (multi-currency view)",
      "Instant digital key delivery",
      "Order history & receipts",
      "Email support (24–48h)",
      "Account dashboard",
      "Wishlist & price-drop opt-in",
    ],
    cta: "Start shopping",
    href: "/products",
    popular: false,
    icon: Store,
  },
  {
    key: "pro",
    name: "Pro Buyer",
    price: "₨ 1,000",
    period: "/month",
    desc: "For regular digital buyers who want priority everything.",
    tagline: "Faster delivery, deeper discounts, real support.",
    features: [
      "Everything in Starter",
      "Priority instant delivery (<10s)",
      "5% off all digital keys",
      "WhatsApp priority support",
      "Early access to new drops",
      "Price-drop alerts on wishlist",
      "Order consolidation & bulk receipt",
      "Save payment methods (secure)",
      "Beta access to new categories",
    ],
    cta: "Go Pro",
    href: "/account",
    popular: true,
    icon: Zap,
  },
  {
    key: "business",
    name: "Business",
    price: "Custom",
    period: "",
    desc: "For teams, agencies & resellers buying at volume.",
    tagline: "Licensing, invoicing & integrations for scale.",
    features: [
      "Everything in Pro Buyer",
      "Bulk licensing (10+ seats)",
      "Dedicated account manager",
      "Net-30 invoicing in PKR/USD",
      "Custom integrations (API, SSO)",
      "Volume discounts up to 25%",
      "SLA-backed delivery guarantee",
      "Tax-compliant invoices (STN)",
      "Team seats & roles",
      "Quarterly business reviews",
    ],
    cta: "Contact sales",
    href: "/contact",
    popular: false,
    icon: Crown,
  },
];

const COMPARISON_GROUPS: Array<{
  group: string;
  rows: Array<{ label: string; icon: typeof Zap; values: [Cell, Cell, Cell] }>;
}> = [
  {
    group: "Catalog & access",
    rows: [
      { label: "Browse full digital catalog", icon: Store, values: [true, true, true] },
      { label: "Hardware (projectors, audio gear)", icon: Gift, values: [true, true, true] },
      { label: "Early access to new drops", icon: Sparkles, values: [false, true, true] },
      { label: "Beta access to new categories", icon: BarChart3, values: [false, true, true] },
      { label: "Volume / bulk licensing", icon: Users, values: [false, false, true] },
    ],
  },
  {
    group: "Delivery & speed",
    rows: [
      { label: "Instant digital delivery", icon: Zap, values: [true, true, true] },
      { label: "Avg. delivery time", icon: Clock, values: ["<30s", "<10s", "<10s + SLA"] },
      { label: "Priority delivery queue", icon: TrendingUp, values: [false, true, true] },
      { label: "Hardware shipping (PK)", icon: CreditCard, values: ["2–5 days", "1–3 days", "1–3 days + priority"] },
    ],
  },
  {
    group: "Pricing & discounts",
    rows: [
      { label: "PKR default currency", icon: CreditCard, values: [true, true, true] },
      { label: "Multi-currency view (USD/EUR/AED/SAR)", icon: CreditCard, values: [true, true, true] },
      { label: "Digital keys discount", icon: BadgeCheck, values: ["—", "5%", "up to 25% volume"] },
      { label: "Price-drop alerts", icon: TrendingUp, values: [false, true, true] },
    ],
  },
  {
    group: "Support & account",
    rows: [
      { label: "Support channel", icon: Headset, values: ["Email", "WhatsApp priority", "Dedicated manager"] },
      { label: "Avg. response time", icon: Clock, values: ["24–48h", "<2h", "<30 min"] },
      { label: "24/7 support coverage", icon: Headphones, values: [true, true, true] },
      { label: "Dedicated account manager", icon: Users, values: [false, false, true] },
    ],
  },
  {
    group: "Billing & integrations",
    rows: [
      { label: "Invoicing", icon: FileText, values: ["Self-serve receipt", "Consolidated receipt", "Net-30 invoice"] },
      { label: "Custom integrations (API/SSO)", icon: Plug, values: [false, false, true] },
      { label: "Team seats & roles", icon: Users, values: [false, false, true] },
      { label: "SLA-backed delivery", icon: ShieldCheck, values: [false, false, true] },
    ],
  },
];

const FAQS = [
  {
    q: "Can I switch plans or cancel anytime?",
    a: "Yes. Pro Buyer is a month-to-month subscription billed in PKR — upgrade, downgrade or cancel from your account dashboard with no penalty. Business plan terms are agreed in your sales contract.",
  },
  {
    q: "How does the 5% Pro discount work?",
    a: "Pro Buyer members automatically receive 5% off every digital key at checkout. The discount is applied before payment and stacks with platform-wide sales. Hardware is excluded.",
  },
  {
    q: "Do you offer invoicing for businesses?",
    a: "Yes — the Business plan includes net-30 invoicing in PKR or USD, tax-compliant invoices with your Sales Tax Number, and a dedicated account manager. Contact sales to set up your account.",
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto size-4 text-amber-300" />;
  if (value === false) return <X className="mx-auto size-4 text-slate-600" />;
  return <span className="text-xs font-medium text-slate-200">{value}</span>;
}

export function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <StorefrontLayout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -right-40 -top-40 -z-10 size-[520px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(250, 204, 21, 0.28) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -left-32 top-20 -z-10 size-[420px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.30) 0%, transparent 65%)", animationDelay: "1.5s" }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-4 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              Pricing · PKR default · cancel anytime
            </div>
            <div className="mb-6 flex items-center justify-center">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={72}
                height={72}
                className="rounded-2xl ring-1 ring-white/10"
                priority
              />
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Simple,{" "}
              <span className="text-gold-gradient">transparent pricing</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-slate-300 sm:text-lg">
              PKR pricing for everyone. Upgrade when you need more.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" /> No hidden fees
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-amber-300" /> Secure checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Headset className="size-3.5 text-amber-300" /> 24/7 support
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TIERS ============ */}
      <section id="tiers" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.key}
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
                <div className="mb-4 flex items-center gap-3">
                  <div className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold tracking-tight text-white">{tier.name}</p>
                    <p className="text-xs text-slate-400">{tier.desc}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white">{tier.price}</span>
                  <span className="text-sm text-slate-400">{tier.period}</span>
                </div>
                <p className="mt-2 text-xs italic text-slate-500">{tier.tagline}</p>
                <Link
                  href={tier.href}
                  className={
                    tier.popular
                      ? "btn-gold-gradient sheen-effect mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                      : "btn-silver-metallic mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                  }
                >
                  {tier.cta} <ArrowRight className="size-4" />
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-amber-300" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          All prices in Pakistani Rupee (₨). Pro &amp; Business plans exclude applicable
          sales tax. Cancel anytime from your account dashboard.
        </p>
      </section>

      {/* ============ COMPARISON TABLE ============ */}
      <section id="compare" className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Compare every feature
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Pick the plan that fits how you buy. No surprises.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0C1428] to-[#0A101F]">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Feature
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.key}
                      className={`p-4 text-center text-xs font-semibold uppercase tracking-wider ${
                        t.popular ? "text-amber-300" : "text-slate-400"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{t.name}</span>
                        <span className="text-[10px] font-normal normal-case text-slate-500">
                          {t.price}
                          {t.period && ` ${t.period}`}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_GROUPS.map((group, gi) => (
                  <Fragment key={`g-${gi}`}>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-300/80"
                      >
                        {group.group}
                      </td>
                    </tr>
                    {group.rows.map((row, ri) => {
                      const RowIcon = row.icon;
                      return (
                        <tr
                          key={`g-${gi}-r-${ri}`}
                          className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02]"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <RowIcon className="size-4 shrink-0 text-slate-500" />
                              <span className="text-sm text-slate-200">{row.label}</span>
                            </div>
                          </td>
                          {row.values.map((v, vi) => (
                            <td key={vi} className="p-4 text-center">
                              <CellValue value={v} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Pricing questions, answered
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Still unsure? Reach out on WhatsApp any time.
          </p>
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
                  className={`size-4 shrink-0 text-amber-300 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-slate-400">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/#faq"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-300 hover:text-amber-200"
          >
            See all FAQs <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 p-8 text-[#070B19] sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.5) 0, transparent 50%)",
            }}
          />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold sm:text-3xl">Not sure? Start free</h2>
              <p className="mt-1 text-[#070B19]/80">
                Browse the catalog, buy a single key, and upgrade to Pro only when
                you&apos;re ready. No credit card to start.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#070B19] px-6 text-sm font-semibold text-amber-300 transition-colors hover:bg-[#070B19]/90"
            >
              Start shopping <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </StorefrontLayout>
  );
}
