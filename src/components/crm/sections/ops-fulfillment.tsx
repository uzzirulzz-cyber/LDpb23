"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  PackageCheck,
  Send,
  CheckCircle2,
  Loader2,
  Truck,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  KpiCard,
  EmptyState,
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
  status: string; // pending | paid | fulfilled | cancelled | refunded
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customer?: OrderCustomer | null;
}

interface ShipmentRow {
  id: string;
  orderId: string | null;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
}

// Mapping: filter label → actual order.status values it represents.
const FILTER_TO_STATUSES: Record<string, string[]> = {
  pending: ["pending"],
  processing: ["paid"],
  fulfilled: ["fulfilled"],
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  paid: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  fulfilled: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  refunded: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

function Pill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_COLORS[label] ??
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label}
    </span>
  );
}

// ============================ Section ============================
export function OpsFulfillmentSection() {
  const { data: orders, loading, error } = useDashboardFetch<OrderListItem[]>(
    "/api/crm/orders"
  );
  const { data: shipments } = useDashboardFetch<ShipmentRow[]>("/api/crm/shipments");
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  // shipment map: orderId → shipment (most recent)
  const shipmentByOrder = React.useMemo(() => {
    const m = new Map<string, ShipmentRow>();
    for (const s of shipments ?? []) {
      if (s.orderId) {
        const existing = m.get(s.orderId);
        if (!existing) m.set(s.orderId, s);
      }
    }
    return m;
  }, [shipments]);

  const kpis = React.useMemo(() => {
    const all = orders ?? [];
    const pending = all.filter((o) => o.status === "pending").length;
    const processing = all.filter((o) => o.status === "paid").length;
    const fulfilled = all.filter((o) => o.status === "fulfilled").length;
    const cancelled = all.filter((o) => o.status === "cancelled").length;
    return { pending, processing, fulfilled, cancelled };
  }, [orders]);

  const filtered = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "none") {
        const allowed = FILTER_TO_STATUSES[statusFilter];
        if (allowed && !allowed.includes(o.status)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [o.orderNumber, o.customer?.name ?? "", o.customer?.email ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  // Row actions
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [shipDialogOrder, setShipDialogOrder] = React.useState<OrderListItem | null>(null);

  const markProcessing = async (o: OrderListItem) => {
    setBusyId(o.id);
    try {
      const res = await fetch(`/api/crm/orders/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(`Order ${o.orderNumber} moved to processing`);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Order Fulfillment"
        description="Move orders through fulfillment: pending → processing → shipped (creates a shipment) → delivered. Real PATCH on /api/crm/orders."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Pending" value={kpis.pending} icon={PackageCheck} tone="amber" noData={!orders} />
        <KpiCard label="Processing" value={kpis.processing} icon={Loader2} tone="blue" noData={!orders} />
        <KpiCard label="Fulfilled" value={kpis.fulfilled} icon={CheckCircle2} tone="emerald" noData={!orders} />
        <KpiCard label="Cancelled" value={kpis.cancelled} icon={Truck} tone="rose" noData={!orders} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[200px] w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing (paid)</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
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
          icon={PackageCheck}
          title="No orders to fulfill"
          description="Orders placed via storefront appear here. Use the row actions to move them through the fulfillment pipeline."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const shipment = shipmentByOrder.get(o.id);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{o.customer?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.customer?.email ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(o.total, "PKR")}
                    </TableCell>
                    <TableCell><Pill label={o.status} /></TableCell>
                    <TableCell className="text-xs">
                      {shipment ? (
                        <div>
                          <div className="font-mono">{shipment.trackingNumber ?? "—"}</div>
                          <div className="text-muted-foreground">{shipment.carrier ?? ""} · {shipment.status}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{timeAgo(o.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === o.id}
                            onClick={() => markProcessing(o)}
                          >
                            {busyId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PackageCheck className="h-3 w-3" />}
                            Processing
                          </Button>
                        ) : null}
                        {o.status === "paid" ? (
                          <Button
                            size="sm"
                            disabled={busyId === o.id}
                            onClick={() => setShipDialogOrder(o)}
                          >
                            {busyId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Mark Shipped
                          </Button>
                        ) : null}
                        {o.status === "fulfilled" && shipment && shipment.status !== "delivered" ? (
                          <MarkDeliveredButton
                            orderNumber={o.orderNumber}
                            shipmentId={shipment.id}
                            disabled={busyId === o.id}
                            onBusy={(b) => setBusyId(b ? o.id : null)}
                          />
                        ) : null}
                        {o.status === "fulfilled" && shipment?.status === "delivered" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Delivered
                          </span>
                        ) : null}
                        {o.status === "fulfilled" && !shipment ? (
                          <span className="text-xs text-muted-foreground italic">No shipment</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MarkShippedDialog
        order={shipDialogOrder}
        onOpenChange={(o) => !o && setShipDialogOrder(null)}
        onDone={() => triggerRefresh()}
      />
    </div>
  );
}

// ============================ Mark Delivered inline button ============================
function MarkDeliveredButton({
  orderNumber,
  shipmentId,
  disabled,
  onBusy,
}: {
  orderNumber: string;
  shipmentId: string;
  disabled: boolean;
  onBusy: (b: boolean) => void;
}) {
  const click = async () => {
    onBusy(true);
    try {
      const res = await fetch(`/api/crm/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(`Order ${orderNumber} marked delivered`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      onBusy(false);
    }
  };
  return (
    <Button size="sm" variant="outline" disabled={disabled} onClick={click}>
      <CheckCircle2 className="h-3 w-3" /> Delivered
    </Button>
  );
}

// ============================ Mark Shipped Dialog ============================
function MarkShippedDialog({
  order,
  onOpenChange,
  onDone,
}: {
  order: OrderListItem | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState<string>("tcs");
  const [address, setAddress] = React.useState("");
  const [country, setCountry] = React.useState("PK");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (order) {
      setTrackingNumber("");
      setCarrier("tcs");
      setAddress("");
      setCountry("PK");
    }
  }, [order]);

  const submit = async () => {
    if (!order) return;
    if (!trackingNumber.trim()) {
      toast.error("Tracking number is required");
      return;
    }
    setSaving(true);
    try {
      // 1. Create the shipment
      const shRes = await fetch("/api/crm/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          trackingNumber: trackingNumber.trim(),
          carrier,
          status: "shipped",
          address: address.trim() || null,
          country,
        }),
      });
      if (!shRes.ok) throw new Error(`Shipment create failed: ${shRes.status}`);

      // 2. Update the order status to fulfilled
      const oRes = await fetch(`/api/crm/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "fulfilled" }),
      });
      if (!oRes.ok) throw new Error(`Order update failed: ${oRes.status}`);

      toast.success(`Order ${order.orderNumber} shipped`);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark order shipped</DialogTitle>
          <DialogDescription>
            Creates a shipment record and moves order <span className="font-mono">{order?.orderNumber}</span> to fulfilled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tn">Tracking number *</Label>
            <Input id="tn" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. TCS-123456789" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ca">Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger id="ca"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcs">TCS</SelectItem>
                  <SelectItem value="leopard">Leopard</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="aramex">Aramex</SelectItem>
                  <SelectItem value="mnp">M&P</SelectItem>
                  <SelectItem value="none">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="co"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PK">Pakistan</SelectItem>
                  <SelectItem value="AE">UAE</SelectItem>
                  <SelectItem value="SA">Saudi Arabia</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="none">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ad">Shipping address</Label>
            <Input id="ad" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, postal code" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Create shipment & mark fulfilled
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
