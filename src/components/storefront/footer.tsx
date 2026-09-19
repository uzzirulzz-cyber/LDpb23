"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle, Send, ShieldCheck, Zap } from "lucide-react";

const COLS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Products",
    links: [
      { label: "Gaming Keys", href: "/products?category=Gaming" },
      { label: "Streaming", href: "/products?category=Streaming" },
      { label: "Subscriptions", href: "/products?category=Subscriptions" },
      { label: "AI Tools", href: "/products?category=AI%20Tools" },
      { label: "Projectors", href: "/products?category=Projectors" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Admin", href: "/admin" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Delivery Info", href: "/products" },
      { label: "Returns", href: "/products" },
      { label: "Privacy Policy", href: "/products" },
      { label: "Terms", href: "/products" },
    ],
  },
];

/**
 * StorefrontFooter — dark navy (#050814) with gold top accent line.
 * 4 columns: Brand, Products, Company, Support. All text slate-400, links
 * hover:text-amber-300.
 */
export function StorefrontFooter() {
  return (
    <footer className="relative mt-24 bg-[#050814] text-slate-400">
      {/* Gold accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={40}
                height={40}
                className="rounded-lg ring-1 ring-white/10"
              />
              <span className="text-lg font-bold tracking-tight text-white">
                playbeat<span className="text-gold-gradient">.digital</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
              Pakistan&apos;s premium digital marketplace — instant delivery,
              verified keys, PKR pricing. Gaming, subscriptions, AI tools,
              SaaS &amp; smart projectors.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <SocialIcon
                href="mailto:hello@playbeat.digital"
                label="Email"
                icon={<Mail className="size-4" />}
              />
              <SocialIcon
                href="https://wa.me/923001234567"
                label="WhatsApp"
                icon={<MessageCircle className="size-4" />}
              />
              <SocialIcon
                href="https://t.me/playbeatdigital"
                label="Telegram"
                icon={<Send className="size-4" />}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-400" /> Verified keys
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="size-3 text-amber-400" /> Instant delivery
              </span>
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-200">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-slate-400 transition-colors hover:text-amber-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Playbeat Digital. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Premium digital marketplace · PKR pricing · Instant auto-delivery
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-all hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
    >
      {icon}
    </a>
  );
}
