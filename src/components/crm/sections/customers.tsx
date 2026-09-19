"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Users,
  ShoppingCart,
  Phone,
  MapPin,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState } from "../shared";
import { MiniAvatar, timeAgo, formatDate } from "../ui-helpers";

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
interface Customer {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
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

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

interface CustomerDetail extends Customer {
  orders: CustomerOrder[];
}

interface OrdersListOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
}

// ============================ Section ============================
export function CustomersSection() {
  const { data: customers, loading, error } = useDashboardFetch<Customer[]>(
    "/api/crm/customers"
  );
  const { data: ordersData } = useDashboardFetch<OrdersListOrder[]>(
    "/api/crm/orders"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [countryFilter, setCountryFilter] = React.useState<string>("none");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const orders = ordersData ?? [];

  const countries = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of customers ?? []) {
      if (c.country) set.add(c.country);
    }
    return Array.from(set).sort();
  }, [customers]);

  // Aggregate orders count + total spend per customer (PKR)
  const stats = React.useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const cur = m.get(o.customerId) ?? { count: 0, total: 0 };
      cur.count += 1;
      // Order.total is stored in source currency; for the table aggregate we
      // display the raw sum in PKR (most orders are PKR default). Per-order
      // source currency is visible in the detail drawer.
      cur.total += o.total;
      m.set(o.customerId, cur);
    }
    return m;
  }, [orders]);

  const filtered = React.useMemo(() => {
    if (!customers) return [];
    return customers.filter((c) => {
      if (countryFilter !== "none" && c.country !== countryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [c.name, c.email, c.phone ?? "", c.city ?? "", c.country ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [customers, countryFilter, search]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Customers"
        description="Customers created from storefront checkout appear here. Add manually for back-office orders."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add Customer
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city..."
            className="pl-9"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="sm:w-[200px] w-full">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading customers: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers are created when orders are placed via the storefront. You can also add a customer manually for back-office orders."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const s = stats.get(c.id);
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <MiniAvatar name={c.name} size={32} />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell>{c.country ?? "—"}</TableCell>
                    <TableCell>{c.city ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s?.count ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {s ? formatMoney(s.total, "PKR") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {timeAgo(c.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerDetailSheet
        customerId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => triggerRefresh()}
      />
    </div>
  );
}

function CustomerDetailSheet({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  // Avoid fetching when no id; use a sentinel URL that 404s harmlessly.
  const url = customerId
    ? `/api/crm/customers/${customerId}`
    : "/api/crm/customers/__none__";
  const { data: customer, loading, error } = useDashboardFetch<CustomerDetail | null>(
    url
  );
  const open = !!customerId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customer detail</SheetTitle>
          <SheetDescription>Profile + order history</SheetDescription>
        </SheetHeader>
        {!customerId ? null : loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error || !customer ? (
          <p className="p-4 text-sm text-rose-600 dark:text-rose-400">
            {error || "Customer not found"}
          </p>
        ) : (
          <div className="p-4 space-y-5">
            <div className="flex items-center gap-3">
              <MiniAvatar name={customer.name} size={48} />
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {customer.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {customer.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field
                label="Phone"
                value={customer.phone}
                icon={Phone}
              />
              <Field
                label="Country"
                value={customer.country}
                icon={MapPin}
              />
              <Field label="City" value={customer.city} />
              <Field label="Address" value={customer.address} />
              <Field label="Customer ID" value={customer.id} mono />
              <Field
                label="Joined"
                value={formatDate(customer.createdAt)}
              />
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Order history (
                {customer.orders.length})
              </h4>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No orders placed yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {customer.orders.map((o) => {
                    const cur = (o.currency as Currency) ?? "PKR";
                    return (
                      <li
                        key={o.id}
                        className="rounded-lg border p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs">
                            {o.orderNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(o.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <OrderStatusPill label={o.status} />
                          <span className="text-sm font-medium tabular-nums">
                            {formatMoney(o.total, cur)}
                          </span>
                        </div>
                        {o.items.length > 0 ? (
                          <ul className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                            {o.items.map((it) => (
                              <li
                                key={it.id}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate">
                                  {it.name} × {it.quantity}
                                </span>
                                <span className="tabular-nums shrink-0">
                                  {formatMoney(it.price * it.quantity, "PKR")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm break-words",
          mono && "font-mono text-xs"
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function OrderStatusPill({ label }: { label: string }) {
  const colors: Record<string, string> = {
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colors[label] ?? colors.pending
      )}
    >
      {label}
    </span>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCountry("");
    setCity("");
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          country: country.trim() || null,
          city: city.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Customer added");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            Manually register a customer for back-office orders.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cn">Name *</Label>
              <Input
                id="cn"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce">Email *</Label>
              <Input
                id="ce"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp">Phone</Label>
              <Input
                id="cp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc">Country</Label>
              <Input
                id="cc"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="cci">City</Label>
              <Input
                id="cci"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
