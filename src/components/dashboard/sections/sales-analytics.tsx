"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  Users,
  Trophy,
  Target,
  Gauge,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SectionHeader,
  KpiCard,
  ChartCard,
  LoadingGrid,
  ChartSkeleton,
} from "../shared";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { MiniAvatar, timeAgo } from "./ui-helpers";

interface DashboardPayload {
  kpis: {
    totalLeads: number;
    newLeads: number;
    wonDeals: number;
    wonValueUsd: number;
    pipelineValueUsd: number;
    conversionRate: number;
    avgScore: number;
    activeDeals: number;
    messagesToday: number;
    revenueUsd: number;
    ordersCount: number;
    completedOrders: number;
    refundedOrders: number;
    pendingOrders: number;
    aov: number;
    productsCount: number;
    invoicesCount: number;
    quotesCount: number;
  };
  leadsTrend: { date: string; count: number; won: number }[];
  revenueTrend: { date: string; revenue: number; orders: number }[];
  sourceBreakdown: { source: string; count: number; valueUsd: number }[];
  funnel: { stage: string; count: number }[];
  currencyMix: { currency: string; count: number; valueUsd: number }[];
  orderStatusBreakdown: { status: string; count: number }[];
  topProducts: { name: string; revenue: number; qty: number }[];
  repPerformance: { name: string; leads: number; wonUsd: number; target: number }[];
  recentActivities: {
    id: string;
    leadId: string;
    type: string;
    description: string;
    createdAt: string;
    lead?: { id: string; name: string; company: string | null };
  }[];
}

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#64748b",
];

const FUNNEL_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
};

const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#f59e0b" },
  completed: { label: "Completed", color: "#10b981" },
  refunded: { label: "Refunded", color: "#ef4444" },
  cancelled: { label: "Cancelled", color: "#64748b" },
  processing: { label: "Processing", color: "#3b82f6" },
  shipped: { label: "Shipped", color: "#06b6d4" },
};

const ACTIVITY_EMOJI: Record<string, string> = {
  call: "📞",
  email: "✉️",
  meeting: "📅",
  note: "📝",
  status_change: "🔄",
  assigned: "👤",
  message: "💬",
};

function compactMoney(value: number, currency: Currency): string {
  const sym = currency === "PKR" ? "₨" : currency === "AED" ? "د.إ" : "$";
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${sym}${Math.round(value / 1000)}k`;
  return `${sym}${Math.round(value)}`;
}

export function SalesAnalyticsSection() {
  const displayCurrency = useDashboard((s) => s.displayCurrency) as Currency;
  const { data, loading, error } = useDashboardFetch<DashboardPayload>(
    "/api/dashboard"
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Sales Analytics"
          description="Revenue, pipeline & team performance overview"
        />
        <LoadingGrid count={4} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Revenue Trend" description="Loading…">
            <ChartSkeleton height={280} />
          </ChartCard>
          <ChartCard title="Leads Trend" description="Loading…">
            <ChartSkeleton height={280} />
          </ChartCard>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-rose-200">
        <CardContent className="p-6 text-sm text-rose-600 dark:text-rose-400">
          Failed to load analytics: {error ?? "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const {
    kpis,
    leadsTrend,
    revenueTrend,
    sourceBreakdown,
    funnel,
    orderStatusBreakdown,
    topProducts,
    repPerformance,
    recentActivities,
  } = data;

  const revenueDisplay = convert(kpis.revenueUsd, "USD", displayCurrency);
  const wonRevenueDisplay = convert(kpis.wonValueUsd, "USD", displayCurrency);
  const aovDisplay = convert(kpis.aov, "USD", displayCurrency);

  const revTrendDisplay = revenueTrend.map((d) => ({
    date: d.date,
    revenue: convert(d.revenue, "USD", displayCurrency),
    orders: d.orders,
  }));
  const topProductsDisplay = topProducts.map((p) => ({
    ...p,
    revenue: convert(p.revenue, "USD", displayCurrency),
  }));

  const maxRepWon = Math.max(1, ...repPerformance.map((r) => r.wonUsd));
  const fulfillmentPct = kpis.ordersCount
    ? Math.round((kpis.completedOrders / kpis.ordersCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sales Analytics"
        description="Revenue, pipeline & team performance overview"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Revenue (${displayCurrency})`}
          value={formatMoney(revenueDisplay, displayCurrency)}
          icon={DollarSign}
          tone="primary"
          footer={`${kpis.completedOrders} completed orders`}
        />
        <KpiCard
          label="Total Orders"
          value={kpis.ordersCount.toLocaleString()}
          icon={ShoppingCart}
          tone="default"
          footer={`${kpis.pendingOrders} pending · ${kpis.refundedOrders} refunded`}
        />
        <KpiCard
          label="Completed Orders"
          value={kpis.completedOrders.toLocaleString()}
          icon={CheckCircle2}
          tone="success"
          footer={`${fulfillmentPct}% fulfillment rate`}
        />
        <KpiCard
          label={`AOV (${displayCurrency})`}
          value={formatMoney(aovDisplay, displayCurrency)}
          icon={TrendingUp}
          tone="default"
          footer="Average order value"
        />
        <KpiCard
          label="Total Leads"
          value={kpis.totalLeads.toLocaleString()}
          icon={Users}
          tone="primary"
          footer={`${kpis.newLeads} new · ${kpis.activeDeals} active deals`}
        />
        <KpiCard
          label={`Won Revenue (${displayCurrency})`}
          value={formatMoney(wonRevenueDisplay, displayCurrency)}
          icon={Trophy}
          tone="success"
          footer={`${kpis.wonDeals} deals closed`}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          icon={Target}
          tone="warning"
          footer="Won / closed leads"
        />
        <KpiCard
          label="Avg Lead Score"
          value={kpis.avgScore.toFixed(0)}
          icon={Gauge}
          tone="default"
          footer="Across all leads"
        />
      </div>

      {/* Revenue + Leads trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          description="Daily completed-order revenue (last 14 days)"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={revTrendDisplay}
              margin={{ left: -8, right: 8, top: 8 }}
            >
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={52}
                tickFormatter={(v: number) => compactMoney(v, displayCurrency)}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatMoney(value, displayCurrency),
                  "Revenue",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Leads Trend"
          description="New vs. won leads per day (14 days)"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={leadsTrend} margin={{ left: -8, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="count"
                name="New leads"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#leadsGrad)"
              />
              <Area
                type="monotone"
                dataKey="won"
                name="Won"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#wonGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Products + Order Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Top Products"
          description="By completed-order revenue"
          className="lg:col-span-2"
        >
          {topProductsDisplay.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No completed orders yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topProductsDisplay}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    compactMoney(v, displayCurrency)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  width={150}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatMoney(value, displayCurrency),
                    "Revenue",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Order Status"
          description="Distribution of all orders"
        >
          {orderStatusBreakdown.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={orderStatusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {orderStatusBreakdown.map((entry, i) => (
                    <Cell
                      key={entry.status}
                      fill={
                        ORDER_STATUS_META[entry.status]?.color ??
                        PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) =>
                    ORDER_STATUS_META[value]?.label ?? value
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Source Breakdown + Funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Lead Sources"
          description="Lead count by acquisition channel"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={sourceBreakdown}
              margin={{ left: -8, right: 8, top: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="source"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Conversion Funnel"
          description="Leads reaching each stage"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnel} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => FUNNEL_LABELS[v] ?? v}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
                labelFormatter={(v: string) => FUNNEL_LABELS[v] ?? v}
              />
              <Bar
                dataKey="count"
                fill="#1d4ed8"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Rep Leaderboard + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Rep Leaderboard"
          description="Won revenue vs. target"
        >
          <div className="space-y-3">
            {repPerformance.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No rep performance data yet.
              </p>
            )}
            {repPerformance.map((rep, idx) => {
              const pct =
                rep.target > 0
                  ? Math.min(100, (rep.wonUsd / rep.target) * 100)
                  : 0;
              const wonDisplay = convert(rep.wonUsd, "USD", displayCurrency);
              const targetDisplay = convert(rep.target, "USD", displayCurrency);
              const widthPct =
                maxRepWon > 0 ? Math.max(4, (rep.wonUsd / maxRepWon) * 100) : 0;
              return (
                <div key={rep.name} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold tabular-nums">
                    {idx + 1}
                  </div>
                  <MiniAvatar name={rep.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {rep.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatMoney(wonDisplay, displayCurrency)} /{" "}
                        {formatMoney(targetDisplay, displayCurrency)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100
                            ? "bg-emerald-500"
                            : pct >= 50
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 tabular-nums"
                  >
                    {rep.leads} leads
                  </Badge>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Recent Activity"
          description="Latest lead & team events"
        >
          <ScrollArea className="h-[340px] pr-3">
            {recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-1">
                {recentActivities.map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-start gap-3 py-2">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-base leading-none">
                          {ACTIVITY_EMOJI[a.type] ?? "•"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{a.description}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {a.lead && (
                            <span className="truncate font-medium text-foreground/80">
                              {a.lead.name}
                            </span>
                          )}
                          <span>·</span>
                          <span>{timeAgo(a.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </ChartCard>
      </div>
    </div>
  );
}
