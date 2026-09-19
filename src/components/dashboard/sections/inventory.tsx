"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Boxes,
  Package,
  AlertTriangle,
  DollarSign,
  Search,
  Plus,
  Minus,
  Trash2,
  Warehouse,
  Zap,
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

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  productId: string | null;
  stock: number;
  reserved: number;
  reorderLevel: number;
  location: string;
  cost: number;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

const LOCATION_META: Record<string, { label: string; cls: string }> = {
  "Digital Vault": { label: "Digital Vault", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20" },
  "Warehouse PK": { label: "Warehouse PK", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20" },
  "Warehouse AE": { label: "Warehouse AE", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/20" },
};

const LOCATIONS = ["Digital Vault", "Warehouse PK", "Warehouse AE"];
const CURRENCIES: Currency[] = ["USD", "PKR", "AED"];

function LocationBadge({ location }: { location: string }) {
  const meta = LOCATION_META[location] ?? { label: location, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={`border font-medium ${meta.cls}`}>
      {location === "Digital Vault" && <Zap className="mr-1 h-3 w-3" />}
      {location !== "Digital Vault" && <Warehouse className="mr-1 h-3 w-3" />}
      {meta.label}
    </Badge>
  );
}

function stockTone(stock: number, reorder: number) {
  if (stock < reorder) return { cls: "text-rose-600 dark:text-rose-400", warn: true, color: "#f43f5e" };
  if (stock < reorder * 2) return { cls: "text-amber-600 dark:text-amber-400", warn: false, color: "#f59e0b" };
  return { cls: "text-emerald-600 dark:text-emerald-400", warn: false, color: "#10b981" };
}

function StockCell({ item, onPatch }: { item: InventoryItem; onPatch: (id: string, stock: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.stock));
  const tone = stockTone(item.stock, item.reorderLevel);

  const commit = () => {
    const n = Number(val);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Stock must be a non-negative number");
      setVal(String(item.stock));
      setEditing(false);
      return;
    }
    if (n !== item.stock) onPatch(item.id, n);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1">
      {tone.warn && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
      {editing ? (
        <Input
          autoFocus
          type="number"
          min={0}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setVal(String(item.stock)); setEditing(false); }
          }}
          className="h-7 w-20 px-1.5 text-xs"
        />
      ) : (
        <button
          onClick={() => { setVal(String(item.stock)); setEditing(true); }}
          className={`rounded px-1 text-sm font-semibold tabular-nums hover:underline ${tone.cls}`}
          title="Click to adjust"
        >
          {item.stock}
        </button>
      )}
      {!editing && (
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={(e) => { e.stopPropagation(); onPatch(item.id, item.stock + 1); }}
            title="Increment"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={(e) => { e.stopPropagation(); onPatch(item.id, Math.max(0, item.stock - 1)); }}
            title="Decrement"
            disabled={item.stock <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AdjustStockDialog({ items, onPatched }: { items: InventoryItem[]; onPatched: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [newStock, setNewStock] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { triggerRefresh } = useDashboard();

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const submit = async () => {
    if (!selectedId) { toast.error("Select an item"); return; }
    const n = Number(newStock);
    if (Number.isNaN(n) || n < 0) { toast.error("Enter a valid stock number"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: n }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      toast.success("Stock adjusted", { description: `${selected?.sku}: ${n} units` });
      setOpen(false);
      setSelectedId("");
      setNewStock("");
      triggerRefresh();
      onPatched();
    } catch (e) {
      toast.error("Adjustment failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Boxes className="h-3.5 w-3.5" /> Adjust Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Inventory item</Label>
            <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); const it = items.find((i) => i.id === v); if (it) setNewStock(String(it.stock)); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select item…" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    <span className="font-mono text-xs">{i.sku}</span> · {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected && (
            <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
              Current stock: <span className="font-semibold text-foreground">{selected.stock}</span> ·
              Reorder level: <span className="font-semibold text-foreground">{selected.reorderLevel}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="new-stock">New stock level</Label>
            <Input id="new-stock" type="number" min={0} value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddItemDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [stock, setStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [location, setLocation] = useState("Digital Vault");
  const [cost, setCost] = useState("0");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [saving, setSaving] = useState(false);
  const { triggerRefresh } = useDashboard();

  const reset = () => {
    setSku(""); setName(""); setStock("0"); setReorderLevel("5");
    setLocation("Digital Vault"); setCost("0"); setCurrency("USD");
  };

  const submit = async () => {
    if (!sku.trim() || !name.trim()) { toast.error("SKU and name are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku, name,
          stock: Number(stock),
          reorderLevel: Number(reorderLevel),
          location, cost: Number(cost), currency,
        }),
      });
      if (!res.ok) throw new Error("Failed to create item");
      toast.success("Inventory item created", { description: `${sku} · ${name}` });
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
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add inventory item</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="i-sku">SKU</Label>
            <Input id="i-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="DVDL-MW2-001" className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-name">Name</Label>
            <Input id="i-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Call of Duty MW2 Key" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-stock">Stock</Label>
            <Input id="i-stock" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-reorder">Reorder level</Label>
            <Input id="i-reorder" type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Currency" /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="i-cost">Cost (per unit, in selected currency)</Label>
            <Input id="i-cost" type="number" min={0} step={0.01} value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create item"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InventorySection() {
  const { data: items, loading, error } = useDashboardFetch<InventoryItem[]>("/api/inventory");
  const { displayCurrency, triggerRefresh } = useDashboard();

  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      if (lowOnly && i.stock >= i.reorderLevel) return false;
      if (search) {
        const q = search.toLowerCase();
        return i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search, lowOnly]);

  const kpis = useMemo(() => {
    if (!items) return { skus: 0, low: 0, totalUnits: 0, value: 0 };
    const skus = items.length;
    const low = items.filter((i) => i.stock < i.reorderLevel).length;
    const totalUnits = items.reduce((s, i) => s + i.stock, 0);
    const value = items.reduce((s, i) => s + convert(i.stock * i.cost, i.currency, displayCurrency), 0);
    return { skus, low, totalUnits, value };
  }, [items, displayCurrency]);

  const locationChart = useMemo(() => {
    if (!items) return [];
    const map: Record<string, number> = {};
    for (const i of items) map[i.location] = (map[i.location] ?? 0) + i.stock;
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v }));
  }, [items]);

  const lowStockList = useMemo(() => {
    if (!items) return [];
    return items
      .filter((i) => i.stock < i.reorderLevel)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);
  }, [items]);

  const patchStock = async (id: string, stock: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      toast.success("Stock updated", { description: `→ ${stock} units` });
      triggerRefresh();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const deleteItem = async (item: InventoryItem) => {
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Item deleted", { description: item.sku });
      triggerRefresh();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const LOCATION_COLORS: Record<string, string> = {
    "Digital Vault": "#3b82f6",
    "Warehouse PK": "#f59e0b",
    "Warehouse AE": "#8b5cf6",
  };

  return (
    <div>
      <SectionHeader
        title="Inventory"
        description="Stock levels across Digital Vault, Warehouse PK, and Warehouse AE."
        action={
          <>
            <AdjustStockDialog items={items ?? []} onPatched={() => {}} />
            <AddItemDialog onCreated={() => {}} />
          </>
        }
      />

      {/* KPIs */}
      {loading ? (
        <LoadingGrid count={4} />
      ) : error ? (
        <Card className="card-shadow"><CardContent className="p-6 text-sm text-rose-500">Failed to load inventory: {error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total SKUs" value={String(kpis.skus)} icon={Boxes} tone="primary" />
          <KpiCard label="Low Stock" value={String(kpis.low)} icon={AlertTriangle} tone={kpis.low > 0 ? "danger" : "default"} footer="items below reorder" />
          <KpiCard label="Total Units" value={kpis.totalUnits.toLocaleString()} icon={Package} tone="default" />
          <KpiCard label="Inventory Value" value={formatMoney(kpis.value, displayCurrency)} icon={DollarSign} tone="success" footer="cost basis" />
        </div>
      )}

      {/* Charts */}
      {!loading && !error && items && items.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Stock by location" description="Units grouped by warehouse" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={locationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                  {locationChart.map((entry) => (
                    <Cell key={entry.name} fill={LOCATION_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Low stock alerts" description="Items below reorder level — restock soon" className="lg:col-span-2">
            {lowStockList.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                All stock levels healthy.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={lowStockList} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="sku"
                    width={140}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} units`, "Stock"]}
                    labelFormatter={(l) => lowStockList.find((i) => i.sku === l)?.name ?? l}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar dataKey="stock" radius={[0, 4, 4, 0]} fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            )}
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
              placeholder="Search by SKU or name…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-1.5">
            <Switch checked={lowOnly} onCheckedChange={setLowOnly} id="low-only" />
            <Label htmlFor="low-only" className="text-xs">Low stock only</Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow mt-4 overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[140px]">SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    No inventory items match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map((item) => {
                const tone = stockTone(item.stock, item.reorderLevel);
                const isLow = item.stock < item.reorderLevel;
                return (
                  <TableRow
                    key={item.id}
                    className={`transition-colors hover:bg-muted/40 ${isLow ? "bg-rose-500/5" : ""}`}
                  >
                    <TableCell>
                      <span className="font-mono text-xs font-semibold">{item.sku}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell>
                      <StockCell item={item} onPatch={patchStock} />
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{item.reserved}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      <span className={tone.cls}>{item.stock - item.reserved}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{item.reorderLevel}</TableCell>
                    <TableCell><LocationBadge location={item.location} /></TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatMoney(convert(item.cost, item.currency, displayCurrency), displayCurrency)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums">
                      {formatMoney(convert(item.stock * item.cost, item.currency, displayCurrency), displayCurrency)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
