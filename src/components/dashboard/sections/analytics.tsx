"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { AnalyticsData } from "@/lib/types";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { useDashboard } from "@/lib/store";
import { SectionHeader, ChartCard, ChartSkeleton } from "../shared";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MiniAvatar } from "../ui-helpers";
import { Trophy, TrendingUp, Filter, Gauge } from "lucide-react";

const COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6610f2", "#0dcaf0", "#fd7e14", "#20c997"];

export function AnalyticsSection() {
  const { data, loading, error } = useDashboardFetch<AnalyticsData>("/api/analytics");
  const displayCurrency = useDashboard((s) => s.displayCurrency) as Currency;

  if (loading) {
    return (
      <div>
        <SectionHeader title="Analytics" description="Deep-dive into lead intelligence & revenue" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton height={300} />
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
        <SectionHeader title="Analytics" />
        <Card className="card-shadow">
          <CardContent className="p-8 text-center text-sm text-rose-600">Failed to load analytics: {error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Analytics" description="Multi-source waterfall discovery & revenue intelligence" />

      {/* Source waterfall */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Source Waterfall" description="Lead discovery by source · total → qualified → won">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sourceWaterfall} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" vertical={false} />
              <XAxis dataKey="source" tick={{ fontSize: 10, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }} cursor={{ fill: "oklch(0.95 0.01 260)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" name="Total" fill="#0d6efd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="qualified" name="Qualified" fill="#ffc107" radius={[3, 3, 0, 0]} />
              <Bar dataKey="won" name="Won" fill="#198754" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Conversion by source */}
        <ChartCard title="Conversion Rate by Source" description="Won / total % per acquisition channel">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.conversionBySource} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} width={76} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }} cursor={{ fill: "oklch(0.95 0.01 260)" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "Conversion"]} />
              <Bar dataKey="rate" name="Conversion" radius={[0, 4, 4, 0]}>
                {data.conversionBySource.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue + Score distribution */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Monthly Revenue" description="Closed-won revenue (converted)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlyRevenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 260)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.02 260)" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoney(convert(v, "USD", displayCurrency), displayCurrency).replace(/\s.*/, "")} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }}
                formatter={(v: number, n) => n === "revenueUsd" ? [formatMoney(convert(v, "USD", displayCurrency), displayCurrency), "Revenue"] : [v, n]}
              />
              <Line type="monotone" dataKey="revenueUsd" stroke="#198754" strokeWidth={2.5} dot={{ r: 3, fill: "#198754" }} activeDot={{ r: 5 }} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Score Distribution" description="Quality spread across leads">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.scoreDistribution} dataKey="count" nameKey="bucket" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.scoreDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 260)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Rep leaderboard table + target progress */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard title="Rep Leaderboard" description="Quota attainment & won revenue" className="lg:col-span-2">
          <div className="space-y-3">
            {data.repLeaderboard.map((r, i) => {
              const pct = r.target > 0 ? Math.min(100, (r.wonUsd / r.target) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <MiniAvatar name={r.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="truncate text-sm font-semibold">{r.name}</span>
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">{r.region}</span>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatMoney(convert(r.wonUsd, "USD", displayCurrency), displayCurrency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="w-10 shrink-0 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {r.won} won · {r.leads} leads · target {formatMoney(convert(r.target, "USD", displayCurrency), displayCurrency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 gap-4">
          <StatTile icon={Trophy} label="Top Performer" value={data.repLeaderboard[0]?.name ?? "—"} sub={data.repLeaderboard[0] ? `${data.repLeaderboard[0].won} deals won` : ""} tone="warning" />
          <StatTile icon={Filter} label="Best Source" value={data.conversionBySource.slice().sort((a, b) => b.rate - a.rate)[0]?.source ?? "—"} sub={data.conversionBySource.slice().sort((a, b) => b.rate - a.rate)[0] ? `${data.conversionBySource.slice().sort((a, b) => b.rate - a.rate)[0].rate.toFixed(1)}% conversion` : ""} tone="primary" />
          <StatTile icon={Gauge} label="Avg Score Bucket" value={data.scoreDistribution.slice().sort((a, b) => b.count - a.count)[0]?.bucket ?? "—"} sub="Most common lead quality" tone="success" />
          <StatTile icon={TrendingUp} label="Best Month" value={data.monthlyRevenue.slice().sort((a, b) => b.revenueUsd - a.revenueUsd)[0]?.month ?? "—"} sub={data.monthlyRevenue.slice().sort((a, b) => b.revenueUsd - a.revenueUsd)[0] ? formatMoney(convert(data.monthlyRevenue.slice().sort((a, b) => b.revenueUsd - a.revenueUsd)[0].revenueUsd, "USD", displayCurrency), displayCurrency) : ""} tone="danger" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, tone }: { icon: typeof Trophy; label: string; value: string; sub: string; tone: "primary" | "success" | "warning" | "danger" }) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <Card className="card-shadow">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-bold">{value}</p>
          <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
