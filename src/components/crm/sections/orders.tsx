"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Bot as BotIcon,
  UserCog,
  Mail,
  MessageCircle,
  Send,
  StickyNote,
  History,
  ListChecks,
  Info,
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
import { timeAgo, formatDate, MiniAvatar } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
interface OrderCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentId: string | null;
  paymentProvider: string | null;
  verificationStatus: string;
  commStatus: string;
  assignedBotId: string | null;
  assignedStaffId: string | null;
  adminNotes: unknown;
  auditHistory: unknown;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  sourceCurrency: string;
  fxRate: number;
  attribution: string | null;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  items: OrderItem[];
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
  timeline: TimelineEvent[];
  communications: CommunicationLog[];
}

interface TimelineEvent {
  id: string;
  orderId: string;
  eventType: string;
  title: string;
  description: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface CommunicationLog {
  id: string;
  orderId: string | null;
  customerId: string | null;
  channel: string;
  direction: string;
  recipient: string;
  sender: string | null;
  subject: string | null;
  message: string;
  templateKey: string | null;
  providerMsgId: string | null;
  deliveryStatus: string;
  readStatus: boolean;
  errorMessage: string | null;
  botId: string | null;
  staffId: string | null;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

// ============================ Status color maps ============================
// Explicit class strings so Tailwind JIT can statically extract them.
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  payment_failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  payment_cancelled: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  verification_required: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  refunded: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  unverified: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
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
  defaultClass = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
}: {
  label: string;
  colorMap: Record<string, string>;
  defaultClass?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        colorMap[label] ?? defaultClass
      )}
    >
      {label || "—"}
    </span>
  );
}

// ============================ Section ============================
export function OrdersSection() {
  const { data: orders, loading, error } = useDashboardFetch<OrderListItem[]>(
    "/api/crm/orders"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("none");
  const [verificationFilter, setVerificationFilter] = React.useState<string>("none");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const kpis = React.useMemo(() => {
    if (!orders) return null;
    return {
      total: orders.length,
      pendingPayments: orders.filter((o) => o.paymentStatus === "pending").length,
      underReview: orders.filter((o) => o.verificationStatus === "pending").length,
      verified: orders.filter((o) => o.verificationStatus === "verified").length,
      failed: orders.filter(
        (o) =>
          o.paymentStatus === "payment_failed" ||
          o.paymentStatus === "failed" ||
          o.paymentStatus === "rejected" ||
          o.verificationStatus === "rejected"
      ).length,
      processing: orders.filter(
        (o) => o.status === "order_processing" || o.status === "payment_verified"
      ).length,
      completed: orders.filter((o) => o.status === "order_completed").length,
    };
  }, [orders]);

  const filtered = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "none" && o.status !== statusFilter) return false;
      if (paymentFilter !== "none" && o.paymentStatus !== paymentFilter) return false;
      if (verificationFilter !== "none" && o.verificationStatus !== verificationFilter)
        return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          o.orderNumber,
          o.customer?.name ?? "",
          o.customer?.email ?? "",
          o.customer?.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, verificationFilter, search]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Orders"
        description="Full order lifecycle: account creation → checkout → payment → verification → processing → completion. Click any row to open the workflow drawer."
      />

      {/* KPIs */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Orders" value={kpis.total} icon={ShoppingCart} tone="blue" noData={kpis.total === 0} />
          <KpiCard label="Pending Payments" value={kpis.pendingPayments} icon={Clock} tone="amber" noData={kpis.total === 0} />
          <KpiCard label="Under Review" value={kpis.underReview} icon={AlertTriangle} tone="violet" noData={kpis.total === 0} />
          <KpiCard label="Verified Payments" value={kpis.verified} icon={CheckCircle2} tone="emerald" noData={kpis.total === 0} />
          <KpiCard label="Failed / Rejected" value={kpis.failed} icon={XCircle} tone="rose" noData={kpis.total === 0} />
          <KpiCard label="Processing" value={kpis.processing} icon={Loader2} tone="cyan" noData={kpis.total === 0} />
          <KpiCard label="Completed" value={kpis.completed} icon={CheckCircle2} tone="emerald" noData={kpis.total === 0} />
        </div>
      ) : null}

      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer email or phone..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All order statuses</SelectItem>
            <SelectItem value="account_created">account_created</SelectItem>
            <SelectItem value="checkout_started">checkout_started</SelectItem>
            <SelectItem value="payment_pending">payment_pending</SelectItem>
            <SelectItem value="payment_submitted">payment_submitted</SelectItem>
            <SelectItem value="payment_verification">payment_verification</SelectItem>
            <SelectItem value="payment_verified">payment_verified</SelectItem>
            <SelectItem value="order_processing">order_processing</SelectItem>
            <SelectItem value="order_completed">order_completed</SelectItem>
            <SelectItem value="payment_failed">payment_failed</SelectItem>
            <SelectItem value="payment_rejected">payment_rejected</SelectItem>
            <SelectItem value="order_cancelled">order_cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All payment statuses</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="processing">processing</SelectItem>
            <SelectItem value="paid">paid</SelectItem>
            <SelectItem value="verified">verified</SelectItem>
            <SelectItem value="verification_required">verification_required</SelectItem>
            <SelectItem value="payment_failed">payment_failed</SelectItem>
            <SelectItem value="rejected">rejected</SelectItem>
            <SelectItem value="refunded">refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verificationFilter} onValueChange={setVerificationFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All verifications</SelectItem>
            <SelectItem value="unverified">unverified</SelectItem>
            <SelectItem value="pending">pending</SelectItem>
            <SelectItem value="verified">verified</SelectItem>
            <SelectItem value="rejected">rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading orders: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders"
          description={
            orders && orders.length > 0
              ? "No orders match the current filters."
              : "Orders appear here when customers check out via the storefront. Honest empty state — no mock data."
          }
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const cur = (o.currency as Currency) ?? "PKR";
                  return (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedId(o.id)}
                    >
                      <TableCell className="font-mono text-xs">
                        {o.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MiniAvatar name={o.customer?.name ?? "?"} size={28} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {o.customer?.name ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {o.customer?.email ?? "—"}
                            </p>
                            {o.customer?.phone ? (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {o.customer.phone}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {o.items?.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <Pill label={o.paymentStatus} colorMap={PAYMENT_STATUS_COLORS} />
                      </TableCell>
                      <TableCell>
                        <Pill
                          label={o.verificationStatus}
                          colorMap={VERIFICATION_STATUS_COLORS}
                        />
                      </TableCell>
                      <TableCell>
                        <Pill label={o.status} colorMap={ORDER_STATUS_COLORS} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {o.assignedBotId ? (
                            <>
                              <BotIcon className="h-3 w-3" />
                              <span className="font-mono truncate max-w-[80px]">
                                bot
                              </span>
                            </>
                          ) : o.assignedStaffId ? (
                            <>
                              <UserCog className="h-3 w-3" />
                              <span className="font-mono truncate max-w-[80px]">
                                staff
                              </span>
                            </>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(o.total, cur)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {timeAgo(o.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(o.id);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <OrderDetailSheet
        orderId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

// ============================ Detail sheet with tabs ============================
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
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {order ? `Order ${order.orderNumber}` : "Order detail"}
          </SheetTitle>
          <SheetDescription>
            Full lifecycle: overview, timeline, communications, and admin
            actions.
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
          <div className="p-4">
            <Tabs defaultValue="overview">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">
                  <Info className="h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1">
                  <History className="h-3.5 w-3.5" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="comms" className="flex-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comms
                </TabsTrigger>
                <TabsTrigger value="actions" className="flex-1">
                  <ListChecks className="h-3.5 w-3.5" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <OverviewTab order={order} />
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <TimelineTab orderId={order.id} />
              </TabsContent>
              <TabsContent value="comms" className="mt-4">
                <CommunicationsTab order={order} />
              </TabsContent>
              <TabsContent value="actions" className="mt-4">
                <ActionsTab order={order} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================ Overview tab ============================
function OverviewTab({ order }: { order: OrderDetail }) {
  const cur = (order.currency as Currency) ?? "PKR";
  const sourceCur = (order.sourceCurrency as Currency) ?? "PKR";
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  let notes: Array<{ id?: string; text: string; adminUserId?: string | null; createdAt?: string; at?: string; by?: string }> = [];
  try {
    const parsed = order.adminNotes as unknown;
    if (Array.isArray(parsed)) {
      notes = parsed as Array<{ id?: string; text: string; adminUserId?: string | null; createdAt?: string; at?: string; by?: string }>;
    } else if (typeof parsed === "string") {
      const inner = JSON.parse(parsed);
      if (Array.isArray(inner)) notes = inner;
    }
  } catch {
    notes = [];
  }

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", note: note.trim(), adminUserId: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Note added");
      setNote("");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Order Number">
            <span className="font-mono text-xs">{order.orderNumber}</span>
          </Field>
          <Field label="Created">
            <span>{formatDate(order.createdAt)}</span>
          </Field>
          <Field label="Payment Method">
            <span>{order.paymentMethod ?? "—"}</span>
          </Field>
          <Field label="Payment Provider">
            <span>{order.paymentProvider ?? "—"}</span>
          </Field>
          <Field label="Payment ID">
            <span className="font-mono text-xs">{order.paymentId ?? "—"}</span>
          </Field>
          <Field label="Attribution">
            <span>{order.attribution ?? "—"}</span>
          </Field>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Status flags
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Pill label={order.status} colorMap={ORDER_STATUS_COLORS} />
          <Pill label={order.paymentStatus} colorMap={PAYMENT_STATUS_COLORS} />
          <Pill
            label={order.verificationStatus}
            colorMap={VERIFICATION_STATUS_COLORS}
          />
          <Badge variant="outline" className="text-[10px]">
            comm: {order.commStatus}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Items ({order.items.length})
        </p>
        {order.items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No line items recorded for this order.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {order.items.map((it) => (
              <li
                key={it.id}
                className="flex justify-between gap-2 text-sm border-b pb-1.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.deliveryType} · qty {it.quantity}
                    {it.licenseKeys.length > 0
                      ? ` · ${it.licenseKeys.length} key${
                          it.licenseKeys.length === 1 ? "" : "s"
                        }`
                      : ""}
                  </p>
                </div>
                <span className="tabular-nums shrink-0">
                  {formatMoney(it.price * it.quantity, "PKR")}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t pt-2 space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(order.subtotal, cur)} />
          <Row label="Discount" value={`- ${formatMoney(order.discount, cur)}`} />
          <Row label="Tax" value={formatMoney(order.tax, cur)} />
          <div className="flex justify-between font-semibold pt-1 border-t mt-1">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(order.total, cur)}</span>
          </div>
          {sourceCur !== cur ? (
            <p className="text-xs text-muted-foreground pt-1">
              Source: {formatMoney(order.total / Math.max(order.fxRate, 1), sourceCur)} ·
              FX {order.fxRate} ({sourceCur}→{cur})
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Assignment
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Assigned Bot">
            <span className="font-mono text-xs">
              {order.assignedBotId ?? "—"}
            </span>
          </Field>
          <Field label="Assigned Staff">
            <span className="font-mono text-xs">
              {order.assignedStaffId ?? "—"}
            </span>
          </Field>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Admin notes ({notes.length})
        </p>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No notes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((n, i) => {
              const ts = n.createdAt ?? n.at;
              const author = n.adminUserId ?? n.by ?? "system";
              return (
                <li key={n.id ?? i} className="rounded border bg-muted/30 p-2 text-sm">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{author}</span>
                    <span>
                      {ts
                        ? formatDate(ts, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap">{n.text}</p>
                </li>
              );
            })}
          </ul>
        )}
        <div className="space-y-2 pt-1">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note (visible only to admins)..."
            rows={2}
          />
          <Button
            size="sm"
            onClick={addNote}
            disabled={saving || !note.trim()}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <StickyNote className="h-3.5 w-3.5" />
            )}
            Add note
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

// ============================ Timeline tab ============================
const TIMELINE_ICON: Record<string, typeof History> = {
  order_created: ShoppingCart,
  payment_submitted: Send,
  payment_verification_started: AlertTriangle,
  super_admin_notified: Bell,
  whatsapp_sent: MessageCircle,
  email_sent: Mail,
  payment_verified: CheckCircle2,
  order_processing: Loader2,
  order_completed: CheckCircle2,
  payment_failed: XCircle,
  payment_rejected: XCircle,
  status_changed: History,
  note_added: StickyNote,
  bot_action: BotIcon,
  human_action: UserCog,
};

function TimelineTab({ orderId }: { orderId: string }) {
  const { data, loading, error } = useDashboardFetch<TimelineEvent[]>(
    `/api/crm/orders/${orderId}/timeline`
  );
  const events = data ?? [];

  if (loading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (error)
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-300">
        Error loading timeline: {error}
      </div>
    );
  if (events.length === 0)
    return (
      <EmptyState
        icon={History}
        title="No timeline events"
        description="Events will appear here as the order progresses through the workflow."
      />
    );

  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const Icon = TIMELINE_ICON[e.eventType] ?? History;
        return (
          <li key={e.id} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 border-b pb-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{e.title}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDate(e.createdAt, {
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
                  {e.eventType}
                </Badge>
                <span>actor: {e.actor}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ============================ Communications tab ============================
function CommunicationsTab({ order }: { order: OrderDetail }) {
  const { data, loading, error } = useDashboardFetch<CommunicationLog[]>(
    `/api/crm/orders/${order.id}/communications`
  );
  const { data: integrations } = useDashboardFetch<Integration[]>(
    "/api/crm/integrations"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const logs = data ?? [];
  const whatsappConnected =
    integrations?.some((i) => i.type === "whatsapp" && i.status === "connected") ?? false;
  const emailConnected =
    integrations?.some((i) => i.type === "sendgrid" && i.status === "connected") ??
    integrations?.some((i) => i.type === "email" && i.status === "connected") ??
    false;

  const [waMessage, setWaMessage] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailBody, setEmailBody] = React.useState("");
  const [sendingWa, setSendingWa] = React.useState(false);
  const [sendingEmail, setSendingEmail] = React.useState(false);

  const sendWhatsApp = async () => {
    if (!waMessage.trim()) return;
    setSendingWa(true);
    try {
      const res = await fetch(`/api/crm/orders/${order.id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "whatsapp",
          message: waMessage.trim(),
          staffId: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const ok = json.data?.ok ?? false;
      const deliveryStatus = json.data?.deliveryStatus ?? "unknown";
      const errorMsg = json.data?.error;
      if (ok && deliveryStatus === "sent") {
        toast.success("WhatsApp message sent");
      } else if (ok && deliveryStatus === "queued") {
        toast.warning(
          "Message logged as queued — WhatsApp requires an approved Meta template to dispatch plain text outside the 24h customer-service window."
        );
      } else if (errorMsg) {
        toast.error(`Send failed: ${errorMsg}`);
      } else {
        toast.warning("Message recorded but not dispatched.");
      }
      setWaMessage("");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingWa(false);
    }
  };

  const sendEmail = async () => {
    if (!emailBody.trim()) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/crm/orders/${order.id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email",
          message: emailBody.trim(),
          staffId: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      const ok = json.data?.ok ?? false;
      const deliveryStatus = json.data?.deliveryStatus ?? "unknown";
      const errorMsg = json.data?.error;
      if (ok && (deliveryStatus === "sent" || deliveryStatus === "delivered")) {
        toast.success("Email sent");
      } else if (ok && deliveryStatus === "queued") {
        toast.warning("Email queued — provider will dispatch shortly.");
      } else if (errorMsg) {
        toast.error(`Send failed: ${errorMsg}`);
      } else {
        toast.warning("Message recorded but not dispatched.");
      }
      setEmailSubject("");
      setEmailBody("");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Send WhatsApp */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Send WhatsApp
          </p>
          {whatsappConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              Connected
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
              Integration Not Configured
            </Badge>
          )}
        </div>
        <Textarea
          value={waMessage}
          onChange={(e) => setWaMessage(e.target.value)}
          placeholder="Type a WhatsApp message..."
          rows={2}
        />
        <Button
          size="sm"
          onClick={sendWhatsApp}
          disabled={sendingWa || !waMessage.trim()}
        >
          {sendingWa ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send WhatsApp
        </Button>
        {!whatsappConnected ? (
          <p className="text-xs text-muted-foreground italic">
            Messages are logged on the order timeline and a CommunicationLog
            record is created, but no real message is dispatched until a
            WhatsApp integration is connected.
          </p>
        ) : null}
      </div>

      {/* Send Email */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Send Email
          </p>
          {emailConnected ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              Connected
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
              Integration Not Configured
            </Badge>
          )}
        </div>
        <Input
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          placeholder={`Subject (defaults to "Order ${order.orderNumber}")`}
        />
        <Textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          placeholder="Type an email body..."
          rows={3}
        />
        <Button
          size="sm"
          onClick={sendEmail}
          disabled={sendingEmail || !emailBody.trim()}
        >
          {sendingEmail ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send Email
        </Button>
        {!emailConnected ? (
          <p className="text-xs text-muted-foreground italic">
            Emails are logged on the order timeline and a CommunicationLog
            record is created, but no real message is dispatched until an email
            integration is connected.
          </p>
        ) : null}
      </div>

      {/* Log */}
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Communication log ({logs.length})
        </p>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No communications recorded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((c) => {
              const isOutbound = c.direction === "outbound";
              const Icon = c.channel === "email" ? Mail : MessageCircle;
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
                      <span className="capitalize">{c.channel}</span>
                      <span>· {c.direction}</span>
                    </span>
                    <span>{formatDate(c.createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {c.subject ? (
                    <p className="text-xs font-medium">{c.subject}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{c.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {c.deliveryStatus}
                    </Badge>
                    <span>to: {c.recipient}</span>
                    {c.errorMessage ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        {c.errorMessage}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================ Actions tab ============================
function ActionsTab({ order }: { order: OrderDetail }) {
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [staffId, setStaffId] = React.useState<string>(order.assignedStaffId ?? "");
  const [busy, setBusy] = React.useState<string | null>(null);

  const { data: staff } = useDashboardFetch<StaffMember[]>("/api/crm/employees");

  const patch = async (action: string, label: string) => {
    setBusy(action);
    try {
      const res = await fetch(`/api/crm/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminUserId: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(label);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const assignStaff = async () => {
    if (!staffId || staffId === "none") {
      toast.error("Select a staff member first");
      return;
    }
    setBusy("assign");
    try {
      const res = await fetch(`/api/crm/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          staffId,
          adminUserId: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success("Staff assigned");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const isVerified =
    order.verificationStatus === "verified" ||
    order.paymentStatus === "verified" ||
    order.paymentStatus === "paid";
  const isRejected =
    order.verificationStatus === "rejected" ||
    order.paymentStatus === "rejected" ||
    order.status === "payment_rejected";
  const isCompleted = order.status === "order_completed";
  const isCancelled = order.status === "order_cancelled";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Payment verification
        </p>
        <p className="text-sm text-muted-foreground">
          Current verification:{" "}
          <Pill
            label={order.verificationStatus}
            colorMap={VERIFICATION_STATUS_COLORS}
          />
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => patch("verify", "Payment verified")}
            disabled={busy !== null || isVerified || isCompleted || isCancelled}
          >
            {busy === "verify" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Verify Payment
          </Button>
          <Button
            variant="outline"
            className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
            onClick={() => patch("reject", "Payment rejected")}
            disabled={busy !== null || isRejected || isCompleted || isCancelled}
          >
            {busy === "reject" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Reject Payment
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Order lifecycle
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => patch("complete", "Order completed")}
            disabled={busy !== null || isCompleted || isCancelled}
          >
            {busy === "complete" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Complete Order
          </Button>
          <Button
            variant="outline"
            className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
            onClick={() => patch("cancel", "Order cancelled")}
            disabled={busy !== null || isCompleted || isCancelled}
          >
            {busy === "cancel" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Cancel Order
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Assign staff
        </p>
        {staff && staff.length > 0 ? (
          <div className="flex gap-2">
            <Select value={staffId || "none"} onValueChange={setStaffId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Select —</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={assignStaff}
              disabled={busy !== null || !staffId || staffId === "none"}
              variant="outline"
            >
              {busy === "assign" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCog className="h-3.5 w-3.5" />
              )}
              Assign
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No staff members registered. Add staff under Employees → Directory.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Current:{" "}
          <span className="font-mono">
            {order.assignedStaffId ?? "Unassigned"}
          </span>
        </p>
      </div>
    </div>
  );
}
