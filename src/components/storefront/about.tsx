"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Sparkles, Zap, ShieldCheck, IndianRupee, Headset,
  Gift, Star, Clock, TrendingUp, Store, Building2, Cpu,
  Wrench, MapPin, Target, Eye, Heart,
} from "lucide-react";
import { StorefrontLayout } from "./layout";

const VALUES = [
  {
    icon: Zap,
    title: "Speed",
    headline: "Instant delivery",
    desc: "Digital keys auto-emailed in seconds. Hardware ships in 2–5 days across PK, UAE & KSA.",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    headline: "Verified keys",
    desc: "Every key sourced from authorized distributors and verified before delivery — guaranteed.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: IndianRupee,
    title: "Value",
    headline: "PKR pricing",
    desc: "Local-currency pricing by default with multi-currency view. No hidden fees, no forex markup.",
    color: "from-sky-500 to-indigo-500",
  },
  {
    icon: Headset,
    title: "Support",
    headline: "24/7 humans",
    desc: "Real people, any time zone, on WhatsApp & email. No bots pretending to be humans.",
    color: "from-violet-500 to-purple-500",
  },
];

const STATS = [
  { value: "50K+", label: "Keys delivered", icon: Gift },
  { value: "4.9/5", label: "Customer rating", icon: Star },
  { value: "<30s", label: "Avg. delivery time", icon: Clock },
  { value: "99.9%", label: "Uptime", icon: TrendingUp },
];

const TEAM = [
  {
    role: "Founder & CEO",
    location: "Lahore, PK",
    icon: Building2,
    bio: "Sets product vision & partnerships. Started playbeat.digital selling gaming keys from a single desk in Lahore.",
  },
  {
    role: "CTO",
    location: "Islamabad, PK",
    icon: Cpu,
    bio: "Leads engineering, security & the delivery automation stack that powers instant key distribution.",
  },
  {
    role: "Head of Ops",
    location: "Dubai, UAE",
    icon: Wrench,
    bio: "Owns fulfillment, vendor relations & cross-border logistics across PK, UAE & KSA.",
  },
];

export function AboutPage() {
  return (
    <StorefrontLayout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -left-32 -top-32 -z-10 size-[460px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="aurora-blob pointer-events-none absolute -right-40 top-10 -z-10 size-[520px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(250, 204, 21, 0.26) 0%, transparent 65%)", animationDelay: "1.5s" }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-4 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
              <Sparkles className="size-3.5" />
              About playbeat.digital
            </div>
            <div className="mb-6 flex items-center justify-center">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={88}
                height={88}
                className="rounded-2xl ring-1 ring-white/10"
                priority
              />
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Powering digital commerce in{" "}
              <span className="text-gold-gradient">Pakistan &amp; beyond</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-slate-300 sm:text-lg">
              Our mission is simple: make buying digital products — gaming keys,
              subscriptions, AI tools, SaaS licenses &amp; smart hardware — as fast,
              trustworthy and locally-priced as buying a cup of chai.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                className="btn-gold-gradient sheen-effect inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
              >
                Browse the catalog <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/contact"
                className="btn-silver-metallic inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold sm:w-auto"
              >
                Talk to us
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-amber-300" /> Lahore · Dubai · Islamabad
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Verified keys
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-300" /> &lt;30s delivery
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold tracking-tight text-white">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ STORY ============ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="glass-navy-panel p-8 sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
            <Store className="size-3.5" /> Our story
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            From a single desk in Lahore to a regional digital marketplace
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            <p>
              Founded in 2024, playbeat.digital started as a gaming-key shop in
              Lahore and grew into a full digital marketplace serving gamers,
              founders, and agencies across PK, UAE &amp; KSA.
            </p>
            <p>
              We built playbeat.digital because buying digital products in Pakistan
              used to be slow, expensive, and risky — forex markups, slow delivery,
              unverified keys, and no local support. We fixed all of it: PKR
              pricing by default, instant automated delivery, verified keys, and
              real humans on WhatsApp around the clock.
            </p>
            <p>
              Today we power thousands of gamers, startups and agencies with gaming
              keys, subscriptions, AI tools, SaaS licenses and smart projectors —
              with a full CRM and automation stack behind the storefront so every
              order, lead and conversation is tracked end-to-end.
            </p>
          </div>
        </div>
      </section>

      {/* ============ VALUES GRID ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              What we stand for
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Four values guide every product, key and conversation.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="glass-navy-card p-6">
                  <div
                    className={`mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} text-white shadow-lg ring-1 ring-white/10`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {v.title}
                  </p>
                  <p className="text-base font-bold tracking-tight text-white">{v.headline}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ MISSION STRIP ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="glass-navy-card p-6">
            <Target className="mb-3 size-6 text-amber-300" />
            <p className="text-sm font-bold text-white">Mission</p>
            <p className="mt-1 text-xs text-slate-400">
              Make buying digital products as fast and trustworthy as buying chai —
              with PKR pricing by default.
            </p>
          </div>
          <div className="glass-navy-card p-6">
            <Eye className="mb-3 size-6 text-amber-300" />
            <p className="text-sm font-bold text-white">Vision</p>
            <p className="mt-1 text-xs text-slate-400">
              The default digital marketplace for emerging markets — starting with
              Pakistan, UAE and Saudi Arabia.
            </p>
          </div>
          <div className="glass-navy-card p-6">
            <Heart className="mb-3 size-6 text-amber-300" />
            <p className="text-sm font-bold text-white">Promise</p>
            <p className="mt-1 text-xs text-slate-400">
              Every key verified. Every order delivered. Every message answered —
              by a human, fast.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TEAM ============ */}
      <section className="border-y border-white/5 bg-[#0A101F]/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              The builders
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Led by a team of builders in Lahore, Dubai &amp; Islamabad.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TEAM.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.role}
                  className="glass-navy-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/15 to-amber-400/5 text-amber-300 ring-1 ring-amber-400/20">
                    <Icon className="size-9" />
                  </div>
                  <p className="text-sm font-bold tracking-tight text-white">{m.role}</p>
                  <p className="text-xs text-slate-400">{m.location}</p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    {m.bio}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Roles shown are functional placeholders — we&apos;ll add real faces
            &amp; bios as the team grows.
          </p>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
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
              <h2 className="text-2xl font-bold sm:text-3xl">
                Join thousands of happy customers
              </h2>
              <p className="mt-1 text-[#070B19]/80">
                Gamers, founders &amp; agencies across PK, UAE &amp; KSA trust
                playbeat.digital for instant digital delivery and PKR pricing.
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
