"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal, Search, Store, X, Home as HomeIcon, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import {
  ProductCard,
  ProductCardSkeleton,
  categoryMeta,
  type StoreProduct,
} from "./product-card";

type ProductsResponse = { data?: StoreProduct[]; count?: number; error?: string };
type SortKey = "newest" | "price-asc" | "price-desc" | "rating";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating", label: "Top rated" },
];

export function ProductsList() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [all, setAll] = useState<StoreProduct[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<string>(initialCategory);
  const [query, setQuery] = useState<string>(initialQuery);
  const [digitalOnly, setDigitalOnly] = useState<"all" | "digital" | "physical">("all");
  const [sort, setSort] = useState<SortKey>("newest");

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
    const list = all.filter((p) => {
      if (category && p.category !== category) return false;
      if (digitalOnly === "digital" && !p.digital) return false;
      if (digitalOnly === "physical" && p.digital) return false;
      if (q) {
        const hay = `${p.name} ${p.sku} ${p.description ?? ""} ${p.subcategory ?? ""} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "rating":
        sorted.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
        break;
      case "newest":
      default:
        sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        break;
    }
    return sorted;
  }, [all, category, query, digitalOnly, sort]);

  const activeCategoryMeta = category ? categoryMeta(category) : null;

  return (
    <StorefrontLayout>
      {/* Header strip */}
      <section className="border-b border-white/5 bg-gradient-to-b from-[#0A101F]/80 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/" className="flex items-center gap-1 hover:text-amber-300">
              <HomeIcon className="size-3" /> Home
            </Link>
            <span>/</span>
            <span className="text-slate-200">Products</span>
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/playbeat-logo.png"
                alt="Playbeat"
                width={44}
                height={44}
                className="rounded-lg ring-1 ring-white/10"
              />
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {activeCategoryMeta && (
                    <activeCategoryMeta.icon className={`size-6 ${activeCategoryMeta.accent}`} />
                  )}
                  {category ? activeCategoryMeta?.label : "All Products"}
                </h1>
                <p className="text-sm text-slate-400">
                  {loading
                    ? "Loading inventory…"
                    : `${filtered.length} item${filtered.length === 1 ? "" : "s"} available`}
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="btn-silver-metallic inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
            >
              <Store className="size-4" /> Store home
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* ============ FILTER SIDEBAR ============ */}
          <aside className="glass-navy-panel h-fit p-5 lg:sticky lg:top-20 lg:self-start">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-amber-300" />
              <h2 className="text-sm font-semibold text-white">Filters</h2>
              {(category || query || digitalOnly !== "all") && (
                <button
                  onClick={() => {
                    setCategory("");
                    setQuery("");
                    setDigitalOnly("all");
                  }}
                  className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-amber-300"
                >
                  <X className="size-3" /> Clear
                </button>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Search</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="border-white/10 bg-white/[0.04] pl-9 text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Category</label>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setCategory("")}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    !category
                      ? "bg-amber-400/10 text-amber-300 font-medium ring-1 ring-amber-400/30"
                      : "text-slate-300 hover:bg-white/5 hover:text-amber-200"
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
                        category === c
                          ? "bg-amber-400/10 text-amber-300 font-medium ring-1 ring-amber-400/30"
                          : "text-slate-300 hover:bg-white/5 hover:text-amber-200"
                      }`}
                    >
                      <Icon className={`size-3.5 ${meta.accent}`} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Type</label>
              <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
                {(["all", "digital", "physical"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDigitalOnly(t)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                      digitalOnly === t
                        ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-amber-200"
                    }`}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-xs text-slate-500">
              <p>Prices in PKR (₨). Digital items delivered instantly to your inbox.</p>
            </div>
          </aside>

          {/* ============ PRODUCT GRID ============ */}
          <div>
            {/* Sort + count */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-200">{filtered.length}</span> of{" "}
                {all?.length ?? 0} products
              </p>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="appearance-none rounded-md border border-white/10 bg-[#0A101F] py-2 pl-3 pr-9 text-xs font-medium text-slate-200 outline-none focus:border-amber-400/50"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-[#0A101F] text-slate-200">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Active filter chips */}
            {(category || query || digitalOnly !== "all") && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300 ring-1 ring-amber-400/30">
                    {categoryMeta(category).label}
                    <button onClick={() => setCategory("")} aria-label="Clear category">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {digitalOnly !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-xs capitalize text-amber-300 ring-1 ring-amber-400/30">
                    {digitalOnly}
                    <button onClick={() => setDigitalOnly("all")} aria-label="Clear type">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {query && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-300 ring-1 ring-amber-400/30">
                    &ldquo;{query}&rdquo;
                    <button onClick={() => setQuery("")} aria-label="Clear search">
                      <X className="size-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
                <p className="text-sm font-medium text-slate-200">No products match your filters</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try clearing filters or browsing all products.
                </p>
                <button
                  onClick={() => {
                    setCategory("");
                    setQuery("");
                    setDigitalOnly("all");
                  }}
                  className="btn-silver-metallic mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
