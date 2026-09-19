"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Sparkles, Mail, MessageCircle, MapPin, Clock,
  Send, ShoppingBag, LifeBuoy, Handshake, ChevronDown,
  ShieldCheck, Zap, Headset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@playbeat.digital",
    href: "mailto:hello@playbeat.digital",
    note: "We reply within a few hours, 24/7.",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+92 300 1234567",
    href: "https://wa.me/923001234567",
    note: "Fastest channel — real humans, any time zone.",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Lahore, Pakistan",
    href: undefined,
    note: "Serving customers across PK, UAE & KSA.",
  },
  {
    icon: Clock,
    label: "Support hours",
    value: "24/7 support",
    href: undefined,
    note: "Always on. Always a real person.",
  },
];

const QUICK_ACTIONS = [
  {
    icon: ShoppingBag,
    title: "Sales inquiry",
    desc: "Pricing, bulk licensing, business plans, partnerships & reseller programs.",
    cta: "Email sales",
    href: "mailto:hello@playbeat.digital?subject=Sales%20inquiry",
    external: true,
  },
  {
    icon: LifeBuoy,
    title: "Support ticket",
    desc: "Issue with an order, a key, or a delivery? Track and manage it from your account.",
    cta: "Open account",
    href: "/account",
    external: false,
  },
  {
    icon: Handshake,
    title: "Partnership",
    desc: "Distributors, vendors, affiliates & integrations — tell us what you're building.",
    cta: "Use the form",
    href: "#contact-form",
    external: false,
  },
];

export function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // No backend — local-only success feedback.
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Message sent", {
        description: "We'll get back to you within a few hours.",
      });
      (e.target as HTMLFormElement).reset();
    }, 500);
  };

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
              Contact playbeat.digital
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
              Get in{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                touch
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Sales, support, partnerships — we reply fast.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Headset className="size-3.5 text-primary" /> 24/7 support
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" /> Fast replies
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" /> Verified team
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FORM + CONTACT INFO ============ */}
      <section id="contact-form" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: FORM */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 gradient-card premium-shadow sm:p-8">
            <h2 className="text-xl font-bold tracking-tight">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill in the form and we&apos;ll get back to you within a few hours.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required placeholder="Your name" autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  placeholder="What's this about?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell us what you need — order numbers, product names, partnership ideas…"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Send className="size-4 animate-pulse" /> Sending…
                  </>
                ) : (
                  <>
                    Send message <Send className="size-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                By submitting, you agree to be contacted about your inquiry. We
                never share your data.
              </p>
            </form>
          </div>

          {/* RIGHT: CONTACT INFO */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-6 gradient-card premium-shadow sm:p-8">
              <h2 className="text-xl font-bold tracking-tight">Contact info</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach us directly — pick whatever&apos;s fastest for you.
              </p>
              <ul className="mt-6 space-y-4">
                {CONTACT_INFO.map((c) => {
                  const Icon = c.icon;
                  const content = (
                    <div className="flex items-start gap-3">
                      <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {c.value}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={c.label}>
                      {c.href ? (
                        <a
                          href={c.href}
                          target={c.href.startsWith("http") ? "_blank" : undefined}
                          rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="block rounded-xl p-2 -m-2 transition-colors hover:bg-accent/50"
                        >
                          {content}
                        </a>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 gradient-card">
              <div className="flex items-start gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Need it urgent?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    WhatsApp is the fastest channel. Most messages get a first reply
                    in under 30 minutes, any time of day.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer">
                      Chat on WhatsApp <ArrowRight className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ QUICK ACTIONS ============ */}
      <section className="border-y border-border/60 bg-accent/20">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Or jump straight to the right place
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Three ways to reach the right team, fast.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              const isExternal = a.external || a.href.startsWith("http") || a.href.startsWith("mailto");
              const inner = (
                <div className="group relative h-full rounded-xl border border-border/60 bg-card p-6 gradient-card premium-shadow transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-base font-bold tracking-tight">{a.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {a.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {a.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              );
              return isExternal ? (
                <a
                  key={a.title}
                  href={a.href}
                  target={a.href.startsWith("http") ? "_blank" : undefined}
                  rel={a.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {inner}
                </a>
              ) : (
                <Link key={a.title} href={a.href}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FAQ LINK ============ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/60 bg-card p-8 gradient-card text-center premium-shadow">
          <ChevronDown className="mx-auto mb-3 size-7 text-primary" />
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Have a question we haven&apos;t answered?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Our full FAQ covers delivery times, payments, refunds, business plans
            and more — most answers are already there.
          </p>
          <Button asChild className="mt-5" size="lg">
            <Link href="/#faq">
              Browse the FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </StorefrontLayout>
  );
}
