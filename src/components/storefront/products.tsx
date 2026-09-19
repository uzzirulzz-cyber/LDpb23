"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, Store, X, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard,
  ProductCardSkeleton,
  categoryMeta,
  type StoreProduct,
} from "./product-card";

type ProductsResponse = { data?: StoreProduct[]; count?: number; error?: string };

export function ProductsList() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [all, setAll] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<string>(initialCategory);
  const [query, setQuery] = useState<string>(initialQuery);
  const [digitalOnly, setDigitalOnly] = useState<"all" | "digital" | "physical">("all");

  useEffect(() => {
    setCategory(initialCategory);
    setQuery(initialQuery);
  }, [initialCategory, initialQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/store/products?limit=500", { cache: "no-store" });
        const json: ProductsResponse = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setAll(json.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setAll([]);
          toast.error("Could not load products", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    if (!all || all.length === 0) return [] as string[];
    const set = new Set<string>();
    all.forEach((p) => set.add(p.category));
    return Array.from(set).sort();
  }, [all]);

  const filtered = useMemo(() => {
    if (!all) return [];
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (category && p.category !== category) return false;
      if (digitalOnly === "digital" && !p.digital) return false;
      if (digitalOnly === "physical" && p.digital) return false;
      if (q) {
        const hay = `${p.name} ${p.sku} ${p.description ?? ""} ${p.subcategory ?? ""} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, category, query, digitalOnly]);

  return (
    <StorefrontLayout>
      {/* Header strip */}
      <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="flex items-center gap-1 hover:text-foreground"><HomeIcon className="size-3" /> Home</Link>
            <span>/</span>
            <span className="text-foreground">Products</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={40}
                height={40}
                className="rounded-lg premium-shadow"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {category ? categoryMeta(category).label : "All Products"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading inventory…" : `${filtered.length} item${filtered.length === 1 ? "" : "s"} available`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/"><Store className="size-4" /> Store home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* ============ FILTER SIDEBAR ============ */}
          <aside className="lg:sticky lg:top-20 lg:self-start space-y-5 rounded-xl border border-border/60 bg-card p-5 gradient-card h-fit">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Filters</h2>
              {(category || query || digitalOnly !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-xs"
                  onClick={() => {
                    setCategory("");
                    setQuery("");
                    setDigitalOnly("all");
                  }}
                >
                  <X className="size-3" /> Clear
                </Button>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setCategory("")}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    !category ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                  }`}
                >
                  All categories
                </button>
                {categories.map((c) => {
                  const meta = categoryMeta(c);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c === category ? "" : c)}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                        category === c ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type</label>
              <div className="flex gap-1 rounded-lg border border-border/60 p-1">
                {(["all", "digital", "physical"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDigitalOnly(t)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                      digitalOnly === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <p>Prices in PKR (₨). Digital items delivered instantly to your inbox.</p>
            </div>
          </aside>

          {/* ============ PRODUCT GRID ============ */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-accent/20 p-12 text-center">
                <p className="text-sm font-medium">No products match your filters</p>
                <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or browsing all products.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/products">Clear filters</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {category && (
                    <Badge variant="secondary" className="gap-1">
                      {categoryMeta(category).label}
                      <button onClick={() => setCategory("")}><X className="size-3" /></button>
                    </Badge>
                  )}
                  {digitalOnly !== "all" && (
                    <Badge variant="secondary" className="gap-1 capitalize">
                      {digitalOnly}
                      <button onClick={() => setDigitalOnly("all")}><X className="size-3" /></button>
                    </Badge>
                  )}
                  {query && (
                    <Badge variant="secondary" className="gap-1">
                      “{query}”
                      <button onClick={() => setQuery("")}><X className="size-3" /></button>
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
