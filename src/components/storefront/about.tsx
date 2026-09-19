"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Sparkles, Zap, ShieldCheck, IndianRupee, Headset,
  Gift, Star, Clock, TrendingUp, Store, Building2, Cpu,
  Wrench, MapPin, Target, Eye, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontLayout } from "./layout";

const VALUES = [
  {
    icon: Zap,
    title: "Speed",
    headline: "Instant delivery",
    desc: "Digital keys auto-emailed in seconds. Hardware ships in 2–5 days across PK, UAE & KSA.",
    color: "from-amber-500 to-orange-500",
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
    color: "from-blue-500 to-indigo-500",
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/15 via-accent/40 to-transparent" />
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(60% 60% at 50% 0%, oklch(0.62 0.20 256 / 0.18) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 glass px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              About playbeat.digital
            </div>
            <div className="mb-6 flex items-center justify-center">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={88}
                height={88}
                className="rounded-2xl premium-shadow"
                priority
              />
            </div>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Powering digital commerce in{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Pakistan &amp; beyond
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Our mission is simple: make buying digital products — gaming keys,
              subscriptions, AI tools, SaaS licenses &amp; smart hardware — as fast,
              trustworthy and locally-priced as buying a cup of chai.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto premium-shadow">
                <Link href="/products">
                  Browse the catalog <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto glass">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> Lahore · Dubai · Islamabad
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" /> Verified keys
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" /> &lt;30s delivery
              </span>
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

      {/* ============ STORY ============ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-card p-8 gradient-card premium-shadow sm:p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Store className="size-3.5" /> Our story
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            From a single desk in Lahore to a regional digital marketplace
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
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
      <section className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              What we stand for
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Four values guide every product, key and conversation.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="rounded-xl border border-border/60 bg-card p-6 gradient-card premium-shadow"
                >
                  <div
                    className={`mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} text-white shadow`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {v.title}
                  </p>
                  <p className="text-base font-bold tracking-tight">{v.headline}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
          <div className="rounded-xl border border-border/60 bg-card p-6 gradient-card">
            <Target className="mb-3 size-6 text-primary" />
            <p className="text-sm font-bold">Mission</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Make buying digital products as fast and trustworthy as buying chai —
              with PKR pricing by default.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-6 gradient-card">
            <Eye className="mb-3 size-6 text-primary" />
            <p className="text-sm font-bold">Vision</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The default digital marketplace for emerging markets — starting with
              Pakistan, UAE and Saudi Arabia.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-6 gradient-card">
            <Heart className="mb-3 size-6 text-primary" />
            <p className="text-sm font-bold">Promise</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Every key verified. Every order delivered. Every message answered —
              by a human, fast.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TEAM ============ */}
      <section className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              The builders
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Led by a team of builders in Lahore, Dubai &amp; Islamabad.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TEAM.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.role}
                  className="rounded-2xl border border-border/60 bg-card p-6 gradient-card premium-shadow text-center"
                >
                  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-blue-500/15 text-primary">
                    <Icon className="size-9" />
                  </div>
                  <p className="text-sm font-bold tracking-tight">{m.role}</p>
                  <p className="text-xs text-muted-foreground">{m.location}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {m.bio}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Roles shown are functional placeholders — we&apos;ll add real faces
            &amp; bios as the team grows.
          </p>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-primary-foreground premium-shadow sm:p-12">
          <div
            className="absolute inset-0 opacity-30"
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
              <p className="mt-1 text-primary-foreground/80">
                Gamers, founders &amp; agencies across PK, UAE &amp; KSA trust
                playbeat.digital for instant digital delivery and PKR pricing.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link href="/products">
                Start shopping <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </StorefrontLayout>
  );
}
