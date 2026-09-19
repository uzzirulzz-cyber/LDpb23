"use client";

import * as React from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Receipt,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import {
  CURRENCIES,
  convert,
  formatMoney,
  type Currency,
} from "@/lib/currency";

import { SectionHeader, KpiCard, ChartCard, LoadingGrid } from "../shared";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// ============================ Types ============================
interface AnalyticsData {
  empty: boolean;
  revenueByMonth: { month: string; revenue: number }[];
  ordersByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  leadsByStatus: Record<string, number>;
  conversionRate: number | "no data";
  topProducts: { name: string; sku: string; revenue: number; qty: number }[];
  totals: { orders: number; leads: number; paidOrders: number };
}

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

// ============================ Section ============================
export function AnalyticsSection() {
  const { data, loading, error } = useDashboardFetch<AnalyticsData>(
    "/api/crm/analytics"
  );
  const displayCurrency = useDashboard((s) => s.displayCurrency);
  const setDisplayCurrency = useDashboard((s) => s.setDisplayCurrency);

  const convertPkr = React.useCallback(
    (pkr: number) => convert(pkr, "PKR", displayCurrency),
    [displayCurrency]
  );
  const fmt = React.useCallback(
    (pkr: number) => formatMoney(convertPkr(pkr), displayCurrency),
    [convertPkr, displayCurrency]
  );

  const revenuePkr = React.useMemo(
    () => data?.revenueByMonth.reduce((s, r) => s + r.revenue, 0) ?? 0,
    [data]
  );
  const aovPkr =
    data && data.totals.paidOrders > 0 ? revenuePkr / data.totals.paidOrders : 0;

  const revenueByMonthData = React.useMemo(
    () =>
      (data?.revenueByMonth ?? []).map((r) => ({
        month: r.month,
        revenue: convertPkr(r.revenue),
      })),
    [data, convertPkr]
  );
  const ordersByStatusData = React.useMemo(
    () =>
      data
        ? Object.entries(data.ordersByStatus).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [data]
  );
  const leadsBySourceData = React.useMemo(
    () =>
      data
        ? Object.entries(data.leadsBySource).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [data]
  );
  const leadsByStatusData = React.useMemo(
    () =>
      data
        ? Object.entries(data.leadsByStatus).map(([name, value]) => ({
            name,
            value,
          }))
        : [],
    [data]
  );
  const topProductsData = React.useMemo(
    () =>
      (data?.topProducts ?? []).map((p) => ({
        name: p.name,
        revenue: convertPkr(p.revenue),
      })),
    [data, convertPkr]
  );

  const empty = data?.empty ?? false;
  const noRevenue = revenueByMonthData.length === 0;
  const noOrders = ordersByStatusData.length === 0;
  const noLeads = leadsBySourceData.length === 0 && leadsByStatusData.length === 0;
  const noTopProducts = topProductsData.length === 0;
  const conversionNoData =
    !data || data.conversionRate === "no data" || empty;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Analytics"
        description="Revenue, orders, leads, and conversion metrics. PKR is the default reporting currency — convert to any supported currency below."
        action={
          <Select
            value={displayCurrency}
            onValueChange={(v) => setDisplayCurrency(v as Currency)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading analytics: {error}
        </div>
      ) : loading ? (
        <LoadingGrid count={5} />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <KpiCard
              label="Revenue"
              value={fmt(revenuePkr)}
              icon={DollarSign}
              tone="emerald"
              noData={empty || noRevenue}
            />
            <KpiCard
              label="Orders"
              value={data?.totals.orders ?? 0}
              icon={ShoppingCart}
              tone="blue"
              noData={empty}
            />
            <KpiCard
              label="Leads"
              value={data?.totals.leads ?? 0}
              icon={Users}
              tone="violet"
              noData={empty}
            />
            <KpiCard
              label="Conversion Rate"
              value={
                data && data.conversionRate !== "no data"
                  ? `${data.conversionRate}%`
                  : "—"
              }
              icon={TrendingUp}
              tone="amber"
              noData={conversionNoData}
            />
            <KpiCard
              label="AOV"
              value={aovPkr > 0 ? fmt(aovPkr) : "—"}
              icon={Receipt}
              tone="cyan"
              noData={empty || aovPkr === 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Revenue Trend"
              description={`Monthly paid-order revenue (${displayCurrency})`}
              noData={noRevenue}
              className="gradient-card premium-shadow"
            >
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueByMonthData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, displayCurrency)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Orders by Status"
              description="Distribution of orders by fulfillment status"
              noData={noOrders}
              className="gradient-card premium-shadow"
            >
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={ordersByStatusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label
                  >
                    {ordersByStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Leads by Source"
              description="Inbound lead volume per acquisition source"
              noData={leadsBySourceData.length === 0}
              className="gradient-card premium-shadow"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leadsBySourceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Leads by Status (Funnel)"
              description="Lead pipeline distribution by stage"
              noData={leadsByStatusData.length === 0}
              className="gradient-card premium-shadow"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leadsByStatusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Top Products by Revenue"
              description={`Top 10 paid products (${displayCurrency})`}
              noData={noTopProducts}
              className="lg:col-span-2 gradient-card premium-shadow"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ left: 30, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={180}
                  />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, displayCurrency)}
                  />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {empty ? (
            <p className="text-xs text-muted-foreground italic text-center">
              No analytics data yet — metrics will populate as orders and leads
              are recorded.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
