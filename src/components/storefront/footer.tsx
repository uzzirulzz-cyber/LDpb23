"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MessageCircle, Send } from "lucide-react";

/**
 * Playbeat footer — branding + storefront + product + support link columns.
 */
export function StorefrontFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-gradient-to-b from-transparent to-accent/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-lg font-bold tracking-tight">
                playbeat<span className="text-primary">.digital</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Instant digital delivery for gaming keys, subscriptions, AI tools,
              SaaS licences, and smart projectors. Verified keys. Premium support.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="mailto:hello@playbeat.digital"
                className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 hover:bg-accent transition-colors"
                aria-label="Email"
              >
                <Mail className="size-4" />
              </a>
              <a
                href="https://wa.me/923000000000"
                target="_blank"
                rel="noreferrer"
                className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 hover:bg-accent transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href="https://t.me/playbeatdigital"
                target="_blank"
                rel="noreferrer"
                className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 hover:bg-accent transition-colors"
                aria-label="Telegram"
              >
                <Send className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Store</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">All Products</Link></li>
              <li><Link href="/products?category=Gaming" className="hover:text-foreground">Gaming Keys</Link></li>
              <li><Link href="/products?category=AI%20Tools" className="hover:text-foreground">AI Tools</Link></li>
              <li><Link href="/products?category=Projectors" className="hover:text-foreground">Projectors</Link></li>
              <li><Link href="/cart" className="hover:text-foreground">Cart</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/account" className="hover:text-foreground">Sign In</Link></li>
              <li><Link href="/account" className="hover:text-foreground">Order History</Link></li>
              <li><Link href="/account" className="hover:text-foreground">License Keys</Link></li>
              <li><Link href="/admin" className="hover:text-foreground">Admin Panel</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">Delivery Info</Link></li>
              <li><Link href="/products" className="hover:text-foreground">Returns</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/products" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/products" className="hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Playbeat Digital. All rights reserved.</p>
          <p>Premium digital marketplace · PKR pricing · Instant auto-delivery</p>
        </div>
      </div>
    </footer>
  );
}
