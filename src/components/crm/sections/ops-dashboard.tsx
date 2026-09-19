"use client";

import * as React from "react";
import {
  PackageCheck,
  Send,
  AlertTriangle,
  Building2,
  Package,
  CheckCircle2,
  Boxes,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  KpiCard,
  ChartCard,
  LoadingGrid,
  ChartSkeleton,
  EmptyState,
} from "../shared";
import { timeAgo } from "../ui-helpers";

import { Card, CardContent } from "@/components/ui/card";
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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ============================ Types ============================
interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customer?: { id: string; name: string; email: string } | null;
}

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  stock: number;
  reserved: number;
  reorderLevel: number;
  location: string;
  cost: number;
  currency: string;
  product?: { id: string; name: string; slug: string; digital: boolean; active: boolean } | null;
}

interface SupplierRow {
  id: string;
  name: string;
  status: string;
  category: string | null;
  country: string | null;
}

interface ShipmentRow {
  id: string;
  status: string;
  carrier: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

// ============================ Helpers ============================
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ============================ Section ============================
export function OpsDashboardSection() {
  const { data: orders, loading: ordersLoading, error: ordersErr } =
    useDashboardFetch<OrderRow[]>("/api/crm/orders");
  const { data: inventory, loading: invLoading, error: invErr } =
    useDashboardFetch<InventoryRow[]>("/api/crm/inventory");
  const { data: suppliers, loading: supLoading } =
    useDashboardFetch<SupplierRow[]>("/api/crm/suppliers");
  const { data: shipments, loading: shipLoading } =
    useDashboardFetch<ShipmentRow[]>("/api/crm/shipments");

  const loading = ordersLoading || invLoading || supLoading || shipLoading;
  const anyError = ordersErr || invErr;

  // KPIs
  const kpis = React.useMemo(() => {
    const pendingFulfillment = (orders ?? []).filter(
      (o) => o.status === "pending" || o.status === "paid"
    ).length;
    const shippedToday = (shipments ?? []).filter((s) =>
      isToday(s.shippedAt)
    ).length;
    const deliveredToday = (shipments ?? []).filter((s) =>
      isToday(s.deliveredAt)
    ).length;
    const lowStockAlerts = (inventory ?? []).filter(
      (i) => i.stock <= i.reorderLevel
    ).length;
    const activeSuppliers = (suppliers ?? []).filter(
      (s) => s.status === "active"
    ).length;
    return {
      pendingFulfillment,
      shippedToday,
      deliveredToday,
      lowStockAlerts,
      activeSuppliers,
    };
  }, [orders, inventory, suppliers, shipments]);

  // Fulfillment queue summary (orders by status)
  const fulfillmentBuckets = React.useMemo(() => {
    const m: Record<string, number> = {
      pending: 0,
      paid: 0,
      fulfilled: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const o of orders ?? []) {
      m[o.status] = (m[o.status] ?? 0) + 1;
    }
    return [
      { status: "Pending", count: m.pending ?? 0, fill: "#f59e0b" },
      { status: "Paid (processing)", count: m.paid ?? 0, fill: "#3b82f6" },
      { status: "Fulfilled", count: m.fulfilled ?? 0, fill: "#10b981" },
      { status: "Cancelled", count: m.cancelled ?? 0, fill: "#ef4444" },
      { status: "Refunded", count: m.refunded ?? 0, fill: "#8b5cf6" },
    ];
  }, [orders]);

  // Shipping status breakdown
  const shippingBreakdown = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of shipments ?? []) {
      m[s.status] = (m[s.status] ?? 0) + 1;
    }
    if (Object.keys(m).length === 0) return [];
    return Object.entries(m).map(([name, value], i) => ({
      name,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [shipments]);

  // Low-stock items
  const lowStockItems = React.useMemo(
    () => (inventory ?? []).filter((i) => i.stock <= i.reorderLevel).slice(0, 8),
    [inventory]
  );

  // Recent orders needing fulfillment
  const queueOrders = React.useMemo(() => {
    return (orders ?? [])
      .filter((o) => o.status === "pending" || o.status === "paid")
      .slice(0, 6);
  }, [orders]);

  const hasOrdersData = (orders?.length ?? 0) > 0;
  const hasShipmentsData = (shipments?.length ?? 0) > 0;
  const hasInventoryData = (inventory?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Operations Dashboard"
        description="Order fulfillment, inventory health, shipping & supplier overview. Real-time data from store + OPS modules."
      />

      {anyError ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading operations data: {anyError}
        </div>
      ) : loading ? (
        <LoadingGrid count={5} />
      ) : (
        <div className="grid gap-3 md:grid-cols-5">
          <KpiCard
            label="Pending Fulfillment"
            value={kpis.pendingFulfillment}
            icon={Package}
            tone="amber"
            noData={!hasOrdersData}
          />
          <KpiCard
            label="Shipped Today"
            value={kpis.shippedToday}
            icon={Send}
            tone="blue"
            noData={!hasShipmentsData}
          />
          <KpiCard
            label="Delivered Today"
            value={kpis.deliveredToday}
            icon={CheckCircle2}
            tone="emerald"
            noData={!hasShipmentsData}
          />
          <KpiCard
            label="Low Stock Alerts"
            value={kpis.lowStockAlerts}
            icon={AlertTriangle}
            tone="rose"
            noData={!hasInventoryData}
          />
          <KpiCard
            label="Active Suppliers"
            value={kpis.activeSuppliers}
            icon={Building2}
            tone="violet"
            noData={(suppliers?.length ?? 0) === 0}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {ordersLoading ? (
          <ChartSkeleton height={260} />
        ) : (
          <ChartCard
            title="Fulfillment Queue"
            description="Orders by fulfillment stage"
            noData={!hasOrdersData}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fulfillmentBuckets} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {shipLoading ? (
          <ChartSkeleton height={260} />
        ) : (
          <ChartCard
            title="Shipping Status Breakdown"
            description="Shipments grouped by status"
            noData={!hasShipmentsData}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shippingBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {shippingBreakdown.map((entry, i) => (
                      <Cell key={`s-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {shippingBreakdown.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {shippingBreakdown.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
                    style={{ borderColor: s.fill + "55", color: s.fill }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.fill }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            ) : null}
          </ChartCard>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-500" /> Fulfillment Queue
              </h3>
              <span className="text-xs text-muted-foreground">
                {queueOrders.length} pending
              </span>
            </div>
            {ordersLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : queueOrders.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="No orders awaiting fulfillment"
                description="When orders come in, they appear here ready to be processed and shipped."
                className="py-8"
              />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Placed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                        <TableCell className="text-sm">
                          {o.customer?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              o.status === "pending"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            )}
                          >
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {timeAgo(o.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-rose-500" /> Inventory Health · Low Stock
              </h3>
              <span className="text-xs text-muted-foreground">
                {lowStockItems.length} items
              </span>
            </div>
            {invLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : lowStockItems.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title={hasInventoryData ? "Stock levels healthy" : "No inventory data"}
                description={
                  hasInventoryData
                    ? "All inventory items are above their reorder level."
                    : "Inventory items will appear here once products are stocked."
                }
                className="py-8"
              />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Reorder At</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <div className="text-sm font-medium truncate max-w-[180px]">{i.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{i.sku}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            {i.stock}
                          </span>
                          {i.reserved > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {" "}(-{i.reserved})
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                          {i.reorderLevel}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.location}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
