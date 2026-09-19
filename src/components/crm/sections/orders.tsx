"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  ShoppingCart,
  DollarSign,
  Clock,
  RotateCcw,
  Copy,
  Trash2,
  Loader2,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  EmptyState,
  KpiCard,
} from "../shared";
import { timeAgo, formatDate } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================ Types ============================
interface OrderCustomer {
  id: string;
  name: string;
  email: string;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentId: string | null;
  subtotal: number;
  total: number;
  currency: string;
  sourceCurrency: string;
  fxRate: number;
  attribution: string | null;
  createdAt: string;
  customer: OrderCustomer;
  items: never[];
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  licenseKeys: string[];
  deliveryType: string;
}

interface OrderDetail extends Omit<OrderListItem, "items"> {
  items: OrderItem[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  currency: string;
  digital: boolean;
  stock: number;
}

// ============================ Constants ============================
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  fulfilled:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  cancelled:
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  refunded:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  refunded:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

function Pill({
  label,
  colorMap,
}: {
  label: string;
  colorMap: Record<string, string>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colorMap[label] ??
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label}
    </span>
  );
}

const PAYMENT_METHODS = [
  "card",
  "bank_transfer",
  "easypaisa",
  "jazzcash",
  "cash_on_delivery",
  "manual",
];

// ============================ Section ============================
export function OrdersSection() {
  const { data: orders, loading, error } = useDashboardFetch<OrderListItem[]>(
    "/api/crm/orders"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);

  const kpis = React.useMemo(() => {
    if (!orders || orders.length === 0) return null;
    let paid = 0,
      pending = 0,
      refunded = 0,
      revenue = 0;
    for (const o of orders) {
      if (o.status === "refunded" || o.paymentStatus === "refunded") {
        refunded += 1;
        continue;
      }
      if (o.status === "paid" || o.paymentStatus === "paid") {
        paid += 1;
        revenue += o.total;
      } else {
        pending += 1;
      }
    }
    return { total: orders.length, paid, pending, refunded, revenue };
  }, [orders]);

  const filtered = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "none" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          o.orderNumber,
          o.customer?.name ?? "",
          o.customer?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Orders"
        description="All orders placed via storefront checkout. Manual orders can be created for back-office sales."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Order
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-5">
        <KpiCard
          label="Total Orders"
          value={kpis?.total ?? 0}
          icon={ShoppingCart}
          tone="blue"
          noData={!kpis}
        />
        <KpiCard
          label="Paid"
          value={kpis?.paid ?? 0}
          icon={DollarSign}
          tone="emerald"
          noData={!kpis}
        />
        <KpiCard
          label="Pending"
          value={kpis?.pending ?? 0}
          icon={Clock}
          tone="amber"
          noData={!kpis}
        />
        <KpiCard
          label="Refunded"
          value={kpis?.refunded ?? 0}
          icon={RotateCcw}
          tone="slate"
          noData={!kpis}
        />
        <KpiCard
          label="Revenue (PKR)"
          value={kpis ? formatMoney(kpis.revenue, "PKR") : "—"}
          icon={DollarSign}
          tone="violet"
          noData={!kpis}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number or customer..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[180px] w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading orders: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="Orders are created via storefront checkout. Manual back-office orders can be added via the New Order button."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelectedId(o.id)}
                >
                  <TableCell className="font-mono text-xs">
                    {o.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {o.customer?.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.customer?.email ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    —
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(o.total, "PKR")}
                  </TableCell>
                  <TableCell>
                    <Pill
                      label={o.paymentStatus}
                      colorMap={PAYMENT_STATUS_COLORS}
                    />
                  </TableCell>
                  <TableCell>
                    <Pill label={o.status} colorMap={ORDER_STATUS_COLORS} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {o.paymentMethod ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {timeAgo(o.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OrderDetailSheet
        orderId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <NewOrderDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => triggerRefresh()}
      />
    </div>
  );
}

function OrderDetailSheet({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const url = orderId
    ? `/api/crm/orders/${orderId}`
    : "/api/crm/orders/__none__";
  const { data: order, loading, error } = useDashboardFetch<OrderDetail | null>(
    url
  );
  const open = !!orderId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order detail</SheetTitle>
          <SheetDescription>
            Full order: customer, line items, license keys, payment.
          </SheetDescription>
        </SheetHeader>
        {!orderId ? null : loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error || !order ? (
          <p className="p-4 text-sm text-rose-600 dark:text-rose-400">
            {error || "Order not found"}
          </p>
        ) : (
          <div className="p-4 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{order.orderNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Pill
                  label={order.status}
                  colorMap={ORDER_STATUS_COLORS}
                />
                <Pill
                  label={order.paymentStatus}
                  colorMap={PAYMENT_STATUS_COLORS}
                />
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Customer
              </h4>
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <div className="font-medium">{order.customer?.name ?? "—"}</div>
                <div className="text-muted-foreground">
                  {order.customer?.email ?? "—"}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Line items ({order.items.length})
              </h4>
              {order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No line items recorded.
                </p>
              ) : (
                <ul className="space-y-2">
                  {order.items.map((it) => (
                    <li key={it.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {it.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {it.deliveryType} · qty {it.quantity}
                          </p>
                        </div>
                        <span className="text-sm tabular-nums font-medium shrink-0">
                          {formatMoney(it.price * it.quantity, "PKR")}
                        </span>
                      </div>
                      {it.licenseKeys && it.licenseKeys.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            License keys
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {it.licenseKeys.map((k, i) => (
                              <LicenseKeyChip key={`${k}-${i}`} value={k} />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  {formatMoney(order.subtotal, "PKR")}
                </span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney(order.total, "PKR")}
                </span>
              </div>
              {order.sourceCurrency && order.sourceCurrency !== "PKR" ? (
                <p className="text-xs text-muted-foreground pt-1">
                  Source: {order.sourceCurrency} @ FX {order.fxRate}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Payment method
                </p>
                <p className="mt-0.5">{order.paymentMethod ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Payment ID
                </p>
                <p className="mt-0.5 font-mono text-xs break-all">
                  {order.paymentId ?? "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Attribution
                </p>
                <p className="mt-0.5 text-xs">
                  {order.attribution ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LicenseKeyChip({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("License key copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 font-mono text-[11px] hover:bg-primary/10 transition-colors"
      title="Click to copy"
    >
      <span>{value}</span>
      <Copy className="h-3 w-3 text-muted-foreground" />
      {copied ? (
        <span className="text-emerald-600 dark:text-emerald-400">copied</span>
      ) : null}
    </button>
  );
}

// ============================ New Order Dialog ============================
function NewOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { data: customers } = useDashboardFetch<Customer[]>("/api/crm/customers");
  const { data: productsData } = useDashboardFetch<{ data: StoreProduct[] } | StoreProduct[]>(
    "/api/store/products?limit=500"
  );

  const products = React.useMemo<StoreProduct[]>(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    return productsData.data ?? [];
  }, [productsData]);

  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">(
    "existing"
  );
  const [customerId, setCustomerId] = React.useState<string>("none");
  const [newCust, setNewCust] = React.useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
  });
  const [items, setItems] = React.useState<
    { productId: string; quantity: number }[]
  >([]);
  const [productId, setProductId] = React.useState<string>("none");
  const [qty, setQty] = React.useState(1);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("manual");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setCustomerMode("existing");
    setCustomerId("none");
    setNewCust({ name: "", email: "", phone: "", country: "", city: "" });
    setItems([]);
    setProductId("none");
    setQty(1);
    setPaymentMethod("manual");
  };

  const addItem = () => {
    if (productId === "none") {
      toast.error("Select a product first");
      return;
    }
    if (items.find((i) => i.productId === productId)) {
      toast.error("Product already added — increase quantity instead");
      return;
    }
    setItems([...items, { productId, quantity: Math.max(1, qty) }]);
    setProductId("none");
    setQty(1);
  };

  const removeItem = (pid: string) => {
    setItems(items.filter((i) => i.productId !== pid));
  };

  const submit = async () => {
    if (customerMode === "existing" && customerId === "none") {
      toast.error("Select a customer");
      return;
    }
    if (customerMode === "new" && (!newCust.name.trim() || !newCust.email.trim())) {
      toast.error("Customer name and email are required");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      // 1. Resolve customer
      let custId = customerId;
      if (customerMode === "new") {
        const cRes = await fetch("/api/crm/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCust.name.trim(),
            email: newCust.email.trim(),
            phone: newCust.phone.trim() || null,
            country: newCust.country.trim() || null,
            city: newCust.city.trim() || null,
          }),
        });
        if (!cRes.ok) throw new Error("Customer creation failed");
        const cJson = await cRes.json();
        custId = cJson.data.id;
      }

      // 2. Add items to cart (one POST per item; cart API upserts quantity)
      for (const it of items) {
        const r = await fetch("/api/store/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: custId,
            productId: it.productId,
            quantity: it.quantity,
          }),
        });
        if (!r.ok) throw new Error("Failed to add item to cart");
      }

      // 3. Checkout
      const ckRes = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: custId,
          paymentMethod,
        }),
      });
      if (!ckRes.ok) {
        const j = await ckRes.json().catch(() => ({}));
        throw new Error(j.error || `Checkout failed: ${ckRes.status}`);
      }
      const ckJson = await ckRes.json();
      toast.success(
        `Order ${ckJson.data?.orderNumber ?? "created"} placed`
      );
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Manual back-office order. Uses storefront checkout flow — creates a
            cart for the customer, then triggers checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={customerMode === "existing" ? "default" : "outline"}
                onClick={() => setCustomerMode("existing")}
              >
                Existing customer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={customerMode === "new" ? "default" : "outline"}
                onClick={() => setCustomerMode("new")}
              >
                New customer
              </Button>
            </div>
            {customerMode === "existing" ? (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select…</SelectItem>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input
                    value={newCust.name}
                    onChange={(e) =>
                      setNewCust({ ...newCust, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newCust.email}
                    onChange={(e) =>
                      setNewCust({ ...newCust, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={newCust.phone}
                    onChange={(e) =>
                      setNewCust({ ...newCust, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    value={newCust.country}
                    onChange={(e) =>
                      setNewCust({ ...newCust, country: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <Label>Line items</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select…</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatMoney(p.price, (p.currency as Currency) ?? "PKR")}{" "}
                        (stock {p.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-20"
              />
              <Button type="button" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No items added yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((it) => {
                  const p = products.find((x) => x.id === it.productId);
                  return (
                    <li
                      key={it.productId}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p?.name ?? it.productId}</p>
                        <p className="text-xs text-muted-foreground">
                          qty {it.quantity}
                          {p
                            ? ` · ${formatMoney(p.price * it.quantity, "PKR")}`
                            : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(it.productId)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Payment */}
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Note: no payment gateway is connected — orders will be marked paid
              with paymentId=null and attribution noting &quot;No payment gateway
              connected&quot;.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Placing order…
              </>
            ) : (
              "Place order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
