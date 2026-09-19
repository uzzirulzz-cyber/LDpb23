"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Send,
  Package,
  Truck,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
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
interface Shipment {
  id: string;
  orderId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  status: string; // pending | shipped | in_transit | delivered | returned
  shippedAt: string | null;
  deliveredAt: string | null;
  address: string | null;
  country: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  shipped: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  in_transit: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  returned: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

function Pill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_COLORS[label] ??
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label.replace("_", " ")}
    </span>
  );
}

// ============================ Section ============================
export function OpsShippingSection() {
  const { data: shipments, loading, error } = useDashboardFetch<Shipment[]>(
    "/api/crm/shipments"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [newOpen, setNewOpen] = React.useState(false);

  const kpis = React.useMemo(() => {
    const all = shipments ?? [];
    return {
      total: all.length,
      pending: all.filter((s) => s.status === "pending").length,
      inTransit: all.filter((s) => s.status === "shipped" || s.status === "in_transit").length,
      delivered: all.filter((s) => s.status === "delivered").length,
    };
  }, [shipments]);

  const filtered = React.useMemo(() => {
    if (!shipments) return [];
    return shipments.filter((s) => {
      if (statusFilter !== "none" && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [s.trackingNumber ?? "", s.carrier ?? "", s.address ?? "", s.orderId ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [shipments, statusFilter, search]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Shipping & Delivery"
        description="Track all shipments. Filter by status, create new shipments, and update tracking in real time."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Shipment
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total Shipments" value={kpis.total} icon={Package} tone="blue" noData={!shipments} />
        <KpiCard label="Pending" value={kpis.pending} icon={Send} tone="amber" noData={!shipments} />
        <KpiCard label="In Transit" value={kpis.inTransit} icon={Truck} tone="cyan" noData={!shipments} />
        <KpiCard label="Delivered" value={kpis.delivered} icon={CheckCircle2} tone="emerald" noData={!shipments} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, carrier, order ID..."
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
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading shipments: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No shipments yet"
          description="Create a new shipment, or ship orders from the Fulfillment queue — shipments will appear here with tracking details."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking #</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Shipped</TableHead>
                <TableHead>Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    {s.trackingNumber ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{s.carrier ?? "—"}</TableCell>
                  <TableCell><Pill label={s.status} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {s.orderId ? s.orderId.slice(-8) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                    {s.address ? `${s.address}${s.country ? `, ${s.country}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.shippedAt ? formatDate(s.shippedAt, { month: "short", day: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.deliveredAt ? formatDate(s.deliveredAt, { month: "short", day: "numeric" }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewShipmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => triggerRefresh()}
      />
    </div>
  );
}

// ============================ New Shipment Dialog ============================
function NewShipmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [orderId, setOrderId] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [carrier, setCarrier] = React.useState<string>("tcs");
  const [status, setStatus] = React.useState<string>("pending");
  const [address, setAddress] = React.useState("");
  const [country, setCountry] = React.useState("PK");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setOrderId("");
    setTrackingNumber("");
    setCarrier("tcs");
    setStatus("pending");
    setAddress("");
    setCountry("PK");
  };

  const submit = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Tracking number is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim() || null,
          trackingNumber: trackingNumber.trim(),
          carrier,
          status,
          address: address.trim() || null,
          country,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Shipment created");
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
          <DialogTitle>New shipment</DialogTitle>
          <DialogDescription>
            Create a standalone shipment record. To ship an existing order, use the Fulfillment queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tn">Tracking number *</Label>
            <Input id="tn" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
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
              <Label htmlFor="st">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="st"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oi">Order ID (optional)</Label>
            <Input id="oi" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="cuid..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-1">
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
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="ad">Address</Label>
              <Input id="ad" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
