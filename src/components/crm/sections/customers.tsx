"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Users,
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  History,
  User as UserIcon,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState } from "../shared";
import { MiniAvatar, timeAgo, formatDate } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

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
  verificationStatus: string;
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
  verificationStatus: string;
  total: number;
  currency: string;
  createdAt: string;
}

interface UnifiedTimelineEvent {
  id: string;
  kind: "order" | "order_timeline" | "communication";
  timestamp: string;
  orderId: string | null;
  orderNumber: string | null;
  title: string;
  description: string;
  actor: string | null;
  channel: string | null;
  metadata: Record<string, unknown>;
}

// Status colors (matching orders.tsx palette)
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  account_created: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  checkout_started: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  payment_pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  payment_submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  payment_verification: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  payment_verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  order_processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  order_completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  payment_failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  payment_rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  order_cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        colorMap[label] ??
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label || "—"}
    </span>
  );
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
        description="Customers created from storefront checkout appear here. Add manually for back-office orders. Click any row to see profile, orders, and unified timeline."
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
          action={
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Customer
            </Button>
          }
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

// ============================ Detail sheet ============================
function CustomerDetailSheet({
  customerId,
  onClose,
}: {
  customerId: string | null;
  onClose: () => void;
}) {
  const url = customerId
    ? `/api/crm/customers/${customerId}`
    : "/api/crm/customers/__none__";
  const { data: customer, loading, error } = useDashboardFetch<CustomerDetail | null>(
    url
  );
  const open = !!customerId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customer detail</SheetTitle>
          <SheetDescription>
            Profile, orders, unified timeline, and all communications.
          </SheetDescription>
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
          <div className="p-4">
            <Tabs defaultValue="profile">
              <TabsList className="w-full">
                <TabsTrigger value="profile" className="flex-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Orders ({customer.orders.length})
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1">
                  <History className="h-3.5 w-3.5" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="comms" className="flex-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comms
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <ProfileTab customer={customer} />
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <OrdersTab customer={customer} />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <TimelineTab customerId={customer.id} />
              </TabsContent>
              <TabsContent value="comms" className="mt-4">
                <CommsTab customerId={customer.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProfileTab({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MiniAvatar name={customer.name} size={48} />
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{customer.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {customer.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Phone" value={customer.phone} icon={Phone} />
        <Field label="Country" value={customer.country} icon={MapPin} />
        <Field label="City" value={customer.city} />
        <Field label="Address" value={customer.address} />
        <Field label="Customer ID" value={customer.id} mono />
        <Field label="User ID" value={customer.userId} mono />
        <Field label="Joined" value={formatDate(customer.createdAt)} />
        <Field label="Updated" value={formatDate(customer.updatedAt)} />
      </div>
    </div>
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

function OrdersTab({ customer }: { customer: CustomerDetail }) {
  if (customer.orders.length === 0)
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No orders"
        description="This customer has not placed any orders yet."
      />
    );
  return (
    <ul className="space-y-2">
      {customer.orders.map((o) => {
        const cur = (o.currency as Currency) ?? "PKR";
        return (
          <li key={o.id} className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{o.orderNumber}</span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(o.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Pill label={o.status} colorMap={ORDER_STATUS_COLORS} />
                <Pill label={o.paymentStatus} colorMap={PAYMENT_STATUS_COLORS} />
                <Pill
                  label={o.verificationStatus}
                  colorMap={{
                    unverified:
                      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
                    pending:
                      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
                    verified:
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                    rejected:
                      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
                  }}
                />
              </div>
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
  );
}

function TimelineTab({ customerId }: { customerId: string }) {
  const { data, loading, error } = useDashboardFetch<UnifiedTimelineEvent[]>(
    `/api/crm/customer/${customerId}/timeline`
  );

  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (error)
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-300">
        Error loading timeline: {error}
      </div>
    );
  if (!data || data.length === 0)
    return (
      <EmptyState
        icon={History}
        title="No timeline events"
        description="Events will appear here as the customer places orders and receives communications."
      />
    );

  const ICON: Record<UnifiedTimelineEvent["kind"], typeof History> = {
    order: ShoppingCart,
    order_timeline: History,
    communication: MessageCircle,
  };

  return (
    <ol className="space-y-3">
      {data.map((e) => {
        const Icon = ICON[e.kind] ?? History;
        return (
          <li key={e.id} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 border-b pb-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{e.title}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDate(e.timestamp, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {e.description ? (
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                  {e.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">
                  {e.kind}
                </Badge>
                {e.actor ? <span>actor: {e.actor}</span> : null}
                {e.channel ? (
                  <span className="capitalize">via {e.channel}</span>
                ) : null}
                {e.orderNumber ? (
                  <span>order: {e.orderNumber}</span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CommsTab({ customerId }: { customerId: string }) {
  // Reuse the unified timeline fetch which already includes communications.
  const { data, loading, error } = useDashboardFetch<UnifiedTimelineEvent[]>(
    `/api/crm/customer/${customerId}/timeline`
  );

  const comms = React.useMemo(() => {
    if (!data) return [];
    return data.filter((e) => e.kind === "communication");
  }, [data]);

  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (error)
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-300">
        Error loading communications: {error}
      </div>
    );
  if (comms.length === 0)
    return (
      <EmptyState
        icon={MessageCircle}
        title="No communications"
        description="WhatsApp and email messages for this customer will appear here."
      />
    );

  return (
    <ul className="space-y-2">
      {comms.map((c) => {
        const channel = c.channel ?? "message";
        const Icon = channel === "email" ? Mail : MessageCircle;
        const meta = c.metadata ?? {};
        const recipient = String(meta.recipient ?? "—");
        const subject = meta.subject ? String(meta.subject) : null;
        const deliveryStatus = String(meta.deliveryStatus ?? "unknown");
        const errorMessage = meta.errorMessage ? String(meta.errorMessage) : null;
        // Title from API looks like "WHATSAPP outbound — <template>"
        const isOutbound = c.title.toLowerCase().includes("outbound");
        return (
          <li
            key={c.id}
            className={cn(
              "rounded border p-2 text-sm space-y-1",
              isOutbound
                ? "bg-blue-500/5 border-blue-500/20"
                : "bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                <span className="capitalize">{channel}</span>
                <span>· {isOutbound ? "outbound" : "inbound"}</span>
              </span>
              <span>
                {formatDate(c.timestamp, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {subject ? (
              <p className="text-xs font-medium">{subject}</p>
            ) : null}
            <p className="whitespace-pre-wrap">{c.description}</p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">
                {deliveryStatus}
              </Badge>
              <span>to: {recipient}</span>
              {errorMessage ? (
                <span className="text-rose-600 dark:text-rose-400">
                  {errorMessage}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ============================ Add customer dialog ============================
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
