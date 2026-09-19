"use client";

import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Activity as ActivityIcon,
  Trophy,
  Coins,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { DashboardData } from "@/lib/types";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { useDashboard } from "@/lib/store";
import { SectionHeader, KpiCard, ChartCard, LoadingGrid, ChartSkeleton } from "../shared";
import { ACTIVITY_ICONS, MiniAvatar, SourceBadge, StatusBadge, timeAgo } from "../ui-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const CHART_COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6610f2", "#0dcaf0", "#fd7e14", "#20c997"];

export function OverviewSection() {
  const { data, loading, error } = useDashboardFetch<DashboardData>("/api/dashboard");
  const displayCurrency = useDashboard((s) => s.displayCurrency) as Currency;

  if (loading) {
    return (
      <div>
        <SectionHeader title="Overview" description="Real-time lead intelligence & pipeline health" />
        <LoadingGrid />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <SectionHeader title="Overview" />
        <Card className="card-shadow">
          <CardContent className="p-8 text-center text-sm text-rose-600">
            Failed to load dashboard: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis } = data;
  const pipelineDisplay = formatMoney(convert(kpis.pipelineValueUsd, "USD", displayCurrency), displayCurrency);
  const wonDisplay = formatMoney(convert(kpis.wonValueUsd, "USD", displayCurrency), displayCurrency);

  return (
    <div>
      <SectionHeader
        title="Overview"
        description="Real-time lead intelligence & pipeline health"
        action={
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Leads"
          value={kpis.totalLeads.toLocaleString()}
          icon={Users}
          tone="primary"
          delta={12.4}
          deltaLabel="vs last 14 days"
        />
        <KpiCard
          label="Pipeline Value"
          value={pipelineDisplay}
          icon={DollarSign}
          tone="success"
          delta={8.1}
          deltaLabel={`in ${displayCurrency}`}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          icon={Target}
          tone="warning"
          delta={-2.3}
          deltaLabel="won / closed"
        />
        <KpiCard
          label="Won Revenue"
          value={wonDisplay}
          icon={TrendingUp}
          tone="success"
          delta={15.7}
          deltaLabel={`${kpis.wonDeals} deals won`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="New Leads" value={kpis.newLeads.toLocaleString()} icon={Zap} tone="primary" />
        <KpiCard label="Avg Lead Score" value={kpis.avgScore.toFixed(0)} icon={Target} tone="warning" />
        <KpiCard label="Active Deals" value={kpis.activeDeals.toLocaleString()} icon={ActivityIcon} tone="default" />
        <KpiCard label="Messages Today" value={kpis.messagesToday.toLocaleString()} icon={Trophy} tone="default" />
      </div>

      {/* Charts row 1 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Leads Trend"
          description="New leads & wins · last 14 days"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.leadsTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0d6efd" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#198754" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#198754" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Area type="monotone" dataKey="count" stroke="#0d6efd" strokeWidth={2} fill="url(#gLeads)" name="New Leads" />
              <Area type="monotone" dataKey="won" stroke="#198754" strokeWidth={2} fill="url(#gWon)" name="Won" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Sources" description="By acquisition channel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.sourceBreakdown.slice(0, 6)} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} width={72} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }}
                cursor={{ fill: "oklch(0.95 0.01 260)" }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.sourceBreakdown.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Conversion Funnel" description="Leads advancing through pipeline stages">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.funnel} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }} cursor={{ fill: "oklch(0.95 0.01 260)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.funnel.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Rep leaderboard */}
        <ChartCard title="Rep Leaderboard" description="Won revenue this period">
          <ScrollArea className="h-[260px] pr-3">
            <div className="space-y-2.5">
              {data.repPerformance.map((r, i) => {
                const pct = r.target > 0 ? Math.min(100, (r.wonUsd / r.target) * 100) : 0;
                return (
                  <div key={r.name} className="flex items-center gap-3">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <MiniAvatar name={r.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold">{r.name}</span>
                        <span className="shrink-0 text-xs font-bold tabular-nums">
                          {formatMoney(convert(r.wonUsd, "USD", displayCurrency), displayCurrency)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </ChartCard>

        {/* Recent activity */}
        <ChartCard title="Recent Activity" description="Latest lead interactions">
          <ScrollArea className="h-[260px] pr-3">
            <div className="space-y-3">
              {data.recentActivities.map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
                    {ACTIVITY_ICONS[a.type] ?? "•"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-foreground">
                      <span className="font-medium">{a.lead?.name ?? "Lead"}</span>{" "}
                      <span className="text-muted-foreground">{a.description}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </ChartCard>
      </div>

      {/* Currency mix */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {data.currencyMix.map((c, i) => (
          <Card key={c.currency} className="card-shadow">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: CHART_COLORS[i] }}>
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.currency}</p>
                  <p className="text-lg font-bold">{formatMoney(convert(c.valueUsd, "USD", c.currency as Currency), c.currency as Currency)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{c.count}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">leads</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
