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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  CheckCircle2,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  Download,
  Trash2,
  Key,
  Copy,
  X,
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
import { timeAgo } from "./ui-helpers";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  price: number;
  qty: number;
  licenseKeys?: string[];
  deliveryType?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  userId: string | null;
  status: string;
  total: number;
  currency: Currency;
  paymentMethod: string;
  items: OrderItem[];
  licenseKeys: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
  refunded: { label: "Refunded", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/20", dot: "bg-violet-500" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/20", dot: "bg-rose-500" },
};

const PAYMENT_META: Record<string, { label: string; cls: string }> = {
  card: { label: "Card", cls: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border-sky-200 dark:border-sky-500/20" },
  paypal: { label: "PayPal", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20" },
  crypto: { label: "Crypto", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20" },
  bank: { label: "Bank Transfer", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20" },
  easypaisa: { label: "EasyPaisa", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20" },
  jazzcash: { label: "JazzCash", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/20" },
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  pending: "#f59e0b",
  processing: "#3b82f6",
  refunded: "#8b5cf6",
  cancelled: "#f43f5e",
};

const STATUS_OPTIONS = ["all", "completed", "pending", "processing", "refunded", "cancelled"];
const PAYMENT_OPTIONS = ["card", "paypal", "crypto", "bank", "easypaisa", "jazzcash"];

function OrderStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  return (
    <Badge variant="outline" className={`gap-1.5 border font-medium ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function PaymentBadge({ method }: { method: string }) {
  const meta = PAYMENT_META[method] ?? { label: method, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={`border font-medium ${meta.cls}`}>
      {meta.label}
    </Badge>
  );
}

function LicenseKeyChip({ keyText }: { keyText: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(keyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-xs transition-colors hover:bg-muted"
      title={copied ? "Copied!" : "Click to copy"}
    >
      <Key className="h-3 w-3 text-amber-500" />
      <span className="truncate max-w-[200px]">{keyText}</span>
      {copied ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function NewOrderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [status, setStatus] = useState("completed");
  const [items, setItems] = useState<{ name: string; qty: string; price: string }[]>([
    { name: "", qty: "1", price: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const { triggerRefresh } = useDashboard();

  const updateItem = (i: number, field: "name" | "qty" | "price", v: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: v } : it)));
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () => setItems((prev) => [...prev, { name: "", qty: "1", price: "" }]);

  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const reset = () => {
    setCustomerName("");
    setCustomerEmail("");
    setPaymentMethod("card");
    setStatus("completed");
    setItems([{ name: "", qty: "1", price: "" }]);
  };

  const submit = async () => {
    if (!customerName.trim() || !customerEmail.trim()) {
      toast.error("Customer name and email are required");
      return;
    }
    const cleanItems = items
      .filter((it) => it.name.trim() && Number(it.price) >= 0 && Number(it.qty) > 0)
      .map((it) => ({ name: it.name.trim(), qty: Number(it.qty), price: Number(it.price) }));
    if (cleanItems.length === 0) {
      toast.error("Add at least one valid line item");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerEmail, paymentMethod, status, items: cleanItems }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      toast.success("Order created", { description: `${cleanItems.length} item(s) · $${total.toFixed(2)}` });
      reset();
      setOpen(false);
      triggerRefresh();
      onCreated();
    } catch (e) {
      toast.error("Could not create order", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new order</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="o-cust-name">Customer name</Label>
            <Input id="o-cust-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-cust-email">Customer email</Label>
            <Input id="o-cust-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{PAYMENT_META[p]?.label ?? p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{STATUS_META[s]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_90px_32px] items-center gap-2">
                <Input
                  placeholder="Product name"
                  value={it.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={it.qty}
                  onChange={(e) => updateItem(i, "qty", e.target.value)}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Price"
                  value={it.price}
                  onChange={(e) => updateItem(i, "price", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold tabular-nums">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDialog({ order, open, onOpenChange }: { order: Order | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { displayCurrency } = useDashboard();
  if (!order) return null;
  const totalConverted = convert(order.total, order.currency, displayCurrency);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-base">{order.orderNumber}</span>
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
            <p className="text-sm font-semibold">{order.customerName}</p>
            <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
          </div>
          <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment</p>
            <div className="flex items-center gap-2"><PaymentBadge method={order.paymentMethod} /></div>
            <p className="text-xs text-muted-foreground">Created {timeAgo(order.createdAt)}</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Line items ({order.items.length})
          </p>
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-3 pr-2">
              {order.items.map((it, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{it.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Qty {it.qty} × {formatMoney(convert(it.price, order.currency, displayCurrency), displayCurrency)}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold tabular-nums">
                      {formatMoney(convert(it.price * it.qty, order.currency, displayCurrency), displayCurrency)}
                    </div>
                  </div>
                  {it.deliveryType && (
                    <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wide">
                      {it.deliveryType}
                    </Badge>
                  )}
                  {it.licenseKeys && it.licenseKeys.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {it.licenseKeys.map((k, ki) => (
                        <LicenseKeyChip key={ki} keyText={k} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Order total</span>
          <span className="text-lg font-bold tabular-nums">
            {formatMoney(totalConverted, displayCurrency)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrdersSection() {
  const { data: orders, loading, error } = useDashboardFetch<Order[]>("/api/orders");
  const { displayCurrency, triggerRefresh } = useDashboard();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, status, search]);

  const kpis = useMemo(() => {
    if (!orders) return { total: 0, completed: 0, refunded: 0, revenue: 0, aov: 0 };
    const total = orders.length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const refunded = orders.filter((o) => o.status === "refunded").length;
    const revenue = orders
      .filter((o) => o.status === "completed")
      .reduce((s, o) => s + convert(o.total, o.currency, displayCurrency), 0);
    const completedOrders = orders.filter((o) => o.status === "completed");
    const aov = completedOrders.length > 0 ? revenue / completedOrders.length : 0;
    return { total, completed, refunded, revenue, aov };
  }, [orders, displayCurrency]);

  const statusChart = useMemo(() => {
    if (!orders) return [];
    const map: Record<string, number> = {};
    for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
    return Object.entries(map).map(([k, v]) => ({ name: STATUS_META[k]?.label ?? k, value: v, key: k }));
  }, [orders]);

  const topCustomers = useMemo(() => {
    if (!orders) return [];
    const map: Record<string, { name: string; count: number; total: number }> = {};
    for (const o of orders) {
      if (!map[o.customerEmail]) map[o.customerEmail] = { name: o.customerName, count: 0, total: 0 };
      map[o.customerEmail].count += 1;
      map[o.customerEmail].total += convert(o.total, o.currency, displayCurrency);
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders, displayCurrency]);

  const openRow = (o: Order) => {
    setSelected(o);
    setDetailOpen(true);
  };

  const patchStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Order updated", { description: `Status → ${STATUS_META[newStatus]?.label ?? newStatus}` });
      triggerRefresh();
    } catch (e) {
      toast.error("Update failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const deleteOrder = async (o: Order) => {
    try {
      const res = await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Order deleted", { description: o.orderNumber });
      triggerRefresh();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  return (
    <div>
      <SectionHeader
        title="Customer Orders"
        description="All orders from playbeat.digital — digital keys, SaaS licenses, gaming accounts."
        action={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("Export queued", { description: "CSV will be ready shortly" })}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <NewOrderDialog onCreated={() => {}} />
          </>
        }
      />

      {/* KPIs */}
      {loading ? (
        <LoadingGrid count={5} />
      ) : error ? (
        <Card className="card-shadow"><CardContent className="p-6 text-sm text-rose-500">Failed to load orders: {error}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Total Orders" value={String(kpis.total)} icon={ShoppingCart} tone="primary" />
          <KpiCard label="Completed" value={String(kpis.completed)} icon={CheckCircle2} tone="success" />
          <KpiCard label="Revenue" value={formatMoney(kpis.revenue, displayCurrency)} icon={DollarSign} tone="default" footer="completed only" />
          <KpiCard label="Refunded" value={String(kpis.refunded)} icon={RotateCcw} tone="danger" />
          <KpiCard label="Avg Order Value" value={formatMoney(kpis.aov, displayCurrency)} icon={TrendingUp} tone="warning" />
        </div>
      )}

      {/* Charts */}
      {!loading && !error && orders && orders.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Orders by status" description="Lifecycle distribution" className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {statusChart.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top customers" description="By revenue (converted)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  formatter={(v: number, n: string) => (n === "total" ? formatMoney(v, displayCurrency) : v)}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} fill="#3b82f6" />
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
              placeholder="Search order #, customer name, email…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : STATUS_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow mt-4 overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[160px]">Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No orders match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map((o) => {
                const itemCount = o.items.reduce((s, it) => s + it.qty, 0);
                const first = o.items[0];
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => openRow(o)}
                  >
                    <TableCell>
                      <span className="font-mono text-xs font-bold">{o.orderNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{o.customerName}</span>
                        <span className="truncate text-xs text-muted-foreground">{o.customerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-semibold">{itemCount}</span>{" "}
                        <span className="text-muted-foreground">items</span>
                        {first && (
                          <div className="max-w-[180px] truncate text-muted-foreground">
                            {first.name}
                            {o.items.length > 1 && (
                              <span className="ml-1 text-primary">+{o.items.length - 1} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(convert(o.total, o.currency, displayCurrency), displayCurrency)}
                    </TableCell>
                    <TableCell><PaymentBadge method={o.paymentMethod} /></TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(o.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={(e) => { e.stopPropagation(); deleteOrder(o); }}
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

      <OrderDetailDialog order={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
