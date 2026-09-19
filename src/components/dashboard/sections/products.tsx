"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  CheckCircle2,
  Key,
  Star,
  DollarSign,
  Search,
  Plus,
  Edit,
  Trash2,
  Truck,
  Gamepad2,
  Tv,
  Bot,
  Cloud,
  MonitorSmartphone,
  Projector,
  Headphones,
  ShieldCheck,
  Infinity as InfinityIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { SectionHeader, KpiCard, ChartCard, LoadingGrid } from "../shared";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  subcategory: string | null;
  price: number;
  currency: Currency;
  digital: boolean;
  deliveryType: string;
  stock: number;
  description: string;
  images: string[];
  variants: unknown[];
  active: boolean;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["Gaming", "Streaming", "AI Tools", "SaaS", "Software", "Projectors", "Audio", "Security"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<string, { icon: typeof Gamepad2; gradient: string; color: string }> = {
  Gaming: { icon: Gamepad2, gradient: "from-violet-500 to-fuchsia-500", color: "#8b5cf6" },
  Streaming: { icon: Tv, gradient: "from-rose-500 to-pink-500", color: "#f43f5e" },
  "AI Tools": { icon: Bot, gradient: "from-emerald-500 to-teal-500", color: "#10b981" },
  SaaS: { icon: Cloud, gradient: "from-sky-500 to-blue-500", color: "#3b82f6" },
  Software: { icon: MonitorSmartphone, gradient: "from-amber-500 to-orange-500", color: "#f59e0b" },
  Projectors: { icon: Projector, gradient: "from-indigo-500 to-purple-500", color: "#6366f1" },
  Audio: { icon: Headphones, gradient: "from-cyan-500 to-blue-500", color: "#06b6d4" },
  Security: { icon: ShieldCheck, gradient: "from-slate-600 to-slate-800", color: "#475569" },
};

const CURRENCIES: Currency[] = ["USD", "PKR", "AED"];

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.Software;
  const Icon = meta.icon;
  return <Icon className={className} />;
}

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${
            n <= Math.floor(rounded)
              ? "fill-amber-400 text-amber-400"
              : n - 0.5 === rounded
              ? "fill-amber-400/50 text-amber-400"
              : "fill-none text-muted-foreground/40"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function ProductCard({
  product,
  displayCurrency,
  onToggleActive,
  onEdit,
}: {
  product: Product;
  displayCurrency: Currency;
  onToggleActive: (p: Product, v: boolean) => void;
  onEdit: (p: Product) => void;
}) {
  const meta = CATEGORY_META[product.category] ?? CATEGORY_META.Software;
  const price = convert(product.price, product.currency, displayCurrency);
  const image = product.images?.[0];

  return (
    <Card className={`card-shadow group relative overflow-hidden transition-all hover:shadow-lg ${!product.active ? "opacity-60" : ""}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
            <CategoryIcon category={product.category} className="h-12 w-12 text-white/90" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge variant="secondary" className="gap-1 bg-background/90 text-xs backdrop-blur">
            {product.category}
          </Badge>
          {product.digital ? (
            <Badge variant="secondary" className="gap-1 bg-amber-500/90 text-xs text-white backdrop-blur">
              <Key className="h-3 w-3" /> Digital
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 bg-sky-500/90 text-xs text-white backdrop-blur">
              <Truck className="h-3 w-3" /> Physical
            </Badge>
          )}
        </div>
        {!product.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Badge variant="outline" className="border-rose-200 bg-rose-500/10 text-rose-600">Inactive</Badge>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <div className="rounded-md bg-background/90 px-1.5 py-0.5 backdrop-blur">
            <Switch
              checked={product.active}
              onCheckedChange={(v) => onToggleActive(product, v)}
              aria-label="Toggle active"
            />
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <button
          className="block w-full text-left"
          onClick={() => onEdit(product)}
        >
          <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{product.name}</h3>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{product.sku}</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-bold tabular-nums">{formatMoney(price, displayCurrency)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {product.digital ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <InfinityIcon className="h-3 w-3" /> Digital
                  </span>
                ) : (
                  <span className={product.stock <= 0 ? "text-rose-500" : ""}>
                    {product.stock} in stock
                  </span>
                )}
              </p>
            </div>
            <RatingStars rating={product.rating} />
          </div>
        </button>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[10px] text-muted-foreground">{product.deliveryType}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onEdit(product)}
          >
            <Edit className="h-3 w-3" /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditProductDialog({ product, open, onOpenChange }: { product: Product | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { displayCurrency, triggerRefresh } = useDashboard();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState<string>("Software");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [digital, setDigital] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync form when product changes
  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(String(product.price));
      setStock(String(product.stock));
      setCategory(product.category);
      setDescription(product.description ?? "");
      setActive(product.active);
      setDigital(product.digital);
    }
  }, [product]);

  if (!product) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: Number(stock),
          category,
          description,
          active,
          digital,
        }),
      });
      if (!res.ok) throw new Error("Failed to update product");
      toast.success("Product updated", { description: name });
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Product deleted", { description: product.name });
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" /> Edit product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Price ({product.currency})</Label>
              <Input id="p-price" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">Stock</Label>
              <Input id="p-stock" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} disabled={digital} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="p-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="p-active" className="text-xs">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="p-digital" checked={digital} onCheckedChange={setDigital} />
              <Label htmlFor="p-digital" className="text-xs">Digital</Label>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-rose-500 hover:bg-rose-500/10" onClick={del} disabled={saving}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddProductDialog({ onCreated }: { onCreated: () => void }) {
  const { triggerRefresh } = useDashboard();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<string>("Gaming");
  const [price, setPrice] = useState("");
  const [digital, setDigital] = useState(true);
  const [stock, setStock] = useState("0");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setSku(""); setCategory("Gaming"); setPrice("");
    setDigital(true); setStock("0"); setDescription("");
  };

  const submit = async () => {
    if (!name.trim() || !sku.trim()) { toast.error("Name and SKU are required"); return; }
    if (!price || Number(price) < 0) { toast.error("Enter a valid price"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, sku, category, price: Number(price), digital,
          stock: Number(stock), description,
        }),
      });
      if (!res.ok) throw new Error("Failed to create product");
      toast.success("Product created", { description: name });
      reset();
      setOpen(false);
      triggerRefresh();
      onCreated();
    } catch (e) {
      toast.error("Create failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add catalog product</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="a-name">Product name</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Call of Duty: Modern Warfare III (Steam Key)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="a-sku">SKU</Label>
              <Input id="a-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="GM-COD-MW3-001" className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="a-price">Price (USD)</Label>
              <Input id="a-price" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.99" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-stock">Stock</Label>
              <Input id="a-stock" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} disabled={digital} />
              {digital && <p className="text-[10px] text-muted-foreground">∞ Digital — stock disabled</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="a-digital" checked={digital} onCheckedChange={setDigital} />
            <Label htmlFor="a-digital" className="text-xs">Digital product (auto-emailed license keys)</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-desc">Description</Label>
            <Textarea id="a-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Region-free Steam key. Instant auto-email delivery." />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create product"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsSection() {
  const { data: products, loading, error } = useDashboardFetch<Product[]>("/api/products");
  const { displayCurrency } = useDashboard();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (activeOnly && !p.active) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, category, activeOnly]);

  const kpis = useMemo(() => {
    if (!products) return { total: 0, active: 0, digital: 0, avgRating: 0, value: 0 };
    const total = products.length;
    const active = products.filter((p) => p.active).length;
    const digital = products.filter((p) => p.digital).length;
    const ratedProducts = products.filter((p) => p.rating > 0);
    const avgRating = ratedProducts.length > 0 ? ratedProducts.reduce((s, p) => s + p.rating, 0) / ratedProducts.length : 0;
    const value = products.reduce((s, p) => s + convert(p.price * Math.max(p.stock, p.digital ? 1 : 0), p.currency, displayCurrency), 0);
    return { total, active, digital, avgRating, value };
  }, [products, displayCurrency]);

  const categoryChart = useMemo(() => {
    if (!products) return [];
    const map: Record<string, number> = {};
    for (const p of products) map[p.category] = (map[p.category] ?? 0) + 1;
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v }));
  }, [products]);

  const toggleActive = async (p: Product, v: boolean) => {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: v }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      toast.success(v ? "Product activated" : "Product deactivated", { description: p.name });
      // We rely on triggerRefresh from store hook in EditProductDialog; here fetch it explicitly
      const { triggerRefresh } = useDashboard.getState();
      triggerRefresh();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setEditOpen(true);
  };

  return (
    <div>
      <SectionHeader
        title="Catalog Products"
        description="playbeat.digital catalog — digital keys, gaming, streaming, AI tools, SaaS, projectors."
        action={<AddProductDialog onCreated={() => {}} />}
      />

      {/* KPIs */}
      {loading ? (
        <LoadingGrid count={5} />
      ) : error ? (
        <Card className="card-shadow"><CardContent className="p-6 text-sm text-rose-500">Failed to load products: {error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Total Products" value={String(kpis.total)} icon={Package} tone="primary" />
          <KpiCard label="Active" value={String(kpis.active)} icon={CheckCircle2} tone="success" />
          <KpiCard label="Digital" value={String(kpis.digital)} icon={Key} tone="warning" />
          <KpiCard label="Avg Rating" value={kpis.avgRating.toFixed(1)} icon={Star} tone="default" footer="rated products" />
          <KpiCard label="Catalog Value" value={formatMoney(kpis.value, displayCurrency)} icon={DollarSign} tone="default" footer="price × stock" />
        </div>
      )}

      {/* Charts */}
      {!loading && !error && products && products.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Products by category" description="Catalog mix" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                  {categoryChart.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_META[entry.name]?.color ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top rated products" description="Highest customer ratings" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={products.filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 6)}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Bar dataKey="rating" radius={[0, 4, 4, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Filter bar */}
      <Card className="card-shadow mt-4">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, description…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-1.5">
              <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only" />
              <Label htmlFor="active-only" className="text-xs">Active only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="card-shadow overflow-hidden">
              <div className="aspect-video w-full animate-pulse bg-muted" />
              <CardContent className="p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-5 w-1/3 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && filtered.length === 0 ? (
        <Card className="card-shadow mt-4">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No products match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              displayCurrency={displayCurrency}
              onToggleActive={toggleActive}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <EditProductDialog product={editing} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
