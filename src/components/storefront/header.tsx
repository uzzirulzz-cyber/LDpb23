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
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useCustomerId } from "./use-customer-id";

const NAV_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * StorefrontHeader — dark navy glassmorphic sticky bar.
 * Logo + wordmark (gold ".digital"), nav links (slate-300 → amber-300 hover),
 * search icon, cart with gold count badge, Sign in (silver), Admin (gold).
 * Mobile: Sheet drawer with nav links.
 */
export function StorefrontHeader() {
  const { data: session } = useSession();
  const customerId = useCustomerId();
  const [count, setCount] = useState(0);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    window.location.href = term ? `/products?q=${encodeURIComponent(term)}` : "/products";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#050814]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <Image
            src="/playbeat-logo.png"
            alt="Playbeat"
            width={36}
            height={36}
            className="rounded-lg ring-1 ring-white/10 transition-transform group-hover:scale-105"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-white">
            playbeat<span className="text-gold-gradient">.digital</span>
          </span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={submitSearch} className="relative hidden md:flex flex-1 max-w-xl ml-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gaming keys, AI tools, projectors…"
            className="border-white/10 bg-white/[0.04] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
          />
        </form>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6 ml-auto">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-amber-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Search icon (mobile) */}
          <Link
            href="/products"
            className="lg:hidden inline-flex size-9 items-center justify-center rounded-md text-slate-300 hover:bg-white/5 hover:text-amber-300"
            aria-label="Search"
          >
            <Search className="size-5" />
          </Link>

          {/* Cart with gold badge */}
          <Link
            href="/cart"
            className="relative inline-flex size-9 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/5 hover:text-amber-300"
            aria-label="Cart"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-[#070B19] shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {/* Sign in (silver) */}
          <Link
            href="/account"
            className="btn-silver-metallic hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold"
          >
            <User className="size-3.5" />
            {session?.user?.name ? session.user.name.split(" ")[0] : "Sign in"}
          </Link>

          {/* Admin (gold) */}
          <Link
            href="/admin"
            className="btn-gold-gradient hidden sm:inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold"
          >
            <LayoutDashboard className="size-3.5" />
            Admin
          </Link>

          {/* Mobile drawer */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden inline-flex size-9 items-center justify-center rounded-md text-slate-300 hover:bg-white/5 hover:text-amber-300"
                aria-label="Menu"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-80 border-white/10 bg-[#0A101F] text-slate-200"
            >
              <SheetTitle className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-base font-bold text-white">
                  <Store className="size-5 text-amber-300" />
                  playbeat<span className="text-gold-gradient">.digital</span>
                </span>
                <SheetClose asChild>
                  <button
                    className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white"
                    aria-label="Close menu"
                  >
                    <X className="size-4" />
                  </button>
                </SheetClose>
              </SheetTitle>

              <form onSubmit={submitSearch} className="relative mt-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products…"
                  className="border-white/10 bg-white/[0.04] pl-9 text-slate-200 placeholder:text-slate-500"
                />
              </form>

              <nav className="mt-5 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-amber-300"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-amber-300"
                >
                  Cart {count > 0 ? `(${count})` : ""}
                </Link>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="btn-silver-metallic mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold"
                >
                  <User className="size-4" />
                  {session?.user?.name ? session.user.name.split(" ")[0] : "Sign in"}
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="btn-gold-gradient mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold"
                >
                  <LayoutDashboard className="size-4" />
                  Admin Panel
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
