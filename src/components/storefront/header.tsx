"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingBag,
  Search,
  User,
  LayoutDashboard,
  Store,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCustomerId } from "./use-customer-id";

/**
 * Storefront top nav — sticky glass bar with logo, search, cart count badge,
 * account link, and CRM link.
 */
export function StorefrontHeader() {
  const { data: session } = useSession();
  const customerId = useCustomerId();
  const [count, setCount] = useState(0);
  const [q, setQ] = useState("");

  const refresh = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/store/cart?customerId=${encodeURIComponent(customerId)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      const items = json?.data?.items ?? [];
      setCount(items.reduce((n: number, i: { quantity?: number }) => n + (i.quantity ?? 0), 0));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const doRefresh = () => { void refresh(); };
    doRefresh();
    const handler = () => void refresh();
    window.addEventListener("playbeat-cart-updated", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("playbeat-cart-updated", handler);
      window.removeEventListener("focus", handler);
    };
  }, [customerId]);

  const navLinks = (
    <>
      <Link href="/products" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Products
      </Link>
      <Link href="/pricing" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Pricing
      </Link>
      <Link href="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        About
      </Link>
      <Link href="/contact" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Contact
      </Link>
      <Link href="/cart" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Cart
      </Link>
      <Link href="/admin" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Admin
      </Link>
      <Link href="/account" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
        Account
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/playbeat-logo.png"
            alt="Playbeat"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-bold tracking-tight">
            playbeat<span className="text-primary">.digital</span>
          </span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            window.location.href = term ? `/products?q=${encodeURIComponent(term)}` : "/products";
          }}
          className="relative hidden md:flex flex-1 max-w-xl"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gaming keys, AI tools, projectors…"
            className="pl-9 bg-background/70"
          />
        </form>

        <nav className="hidden lg:flex items-center gap-6 ml-auto">{navLinks}</nav>

        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Cart">
            <Link href="/cart">
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground premium-shadow">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/account">
              <User className="size-4" />
              {session?.user?.name ? session.user.name.split(" ")[0] : "Sign in"}
            </Link>
          </Button>

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/admin">
              <LayoutDashboard className="size-4" />
              Admin
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-1 pb-2 flex items-center gap-2">
                <Store className="size-5 text-primary" />
                <span className="font-bold">playbeat<span className="text-primary">.digital</span></span>
              </SheetTitle>
              <nav className="mt-4 flex flex-col gap-1">
                <Link href="/products" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Products</Link>
                <Link href="/pricing" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Pricing</Link>
                <Link href="/about" className="rounded-md px-3 py-2 text-sm hover:bg-accent">About</Link>
                <Link href="/contact" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Contact</Link>
                <Link href="/cart" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Cart {count > 0 ? `(${count})` : ""}</Link>
                <Link href="/admin" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Admin</Link>
                <Link href="/account" className="rounded-md px-3 py-2 text-sm hover:bg-accent">Account</Link>
              </nav>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const term = q.trim();
                  window.location.href = term ? `/products?q=${encodeURIComponent(term)}` : "/products";
                }}
                className="mt-4 relative"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products…"
                  className="pl-9"
                />
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
