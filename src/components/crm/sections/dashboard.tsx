"use client";

import * as React from "react";
import {
  Users,
  TrendingUp,
  Banknote,
  ShoppingCart,
  UserCheck,
  Bot,
  Workflow,
  Percent,
  Activity as ActivityIcon,
  Plug,
  CircleDot,
  ArrowRight,
  Cpu,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  ChartCard,
  EmptyState,
  LoadingGrid,
  ChartSkeleton,
} from "../shared";
import { BotStatusBadge, timeAgo, formatDate } from "../ui-helpers";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// ============================ Types ============================
interface DashboardKpis {
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  pipelineValuePkr: number;
  revenuePkr: number;
  ordersCount: number;
  customersCount: number;
  activeBots: number;
  idleBots: number;
  funnelsRunning: number;
  apiRunsToday: number;
}
interface DashboardActivity {
  id: string;
  leadId: string | null;
  contactId: string | null;
  accountId: string | null;
  type: string;
  description: string;
  meta: Record<string, unknown>;
  createdAt: string;
  lead?: { id: string; name: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  account?: { id: string; name: string } | null;
}
interface DashboardBot {
  id: string;
  name: string;
  role: string;
  status: string;
  enabled: boolean;
  currentJob: string | null;
  lastHeartbeat: string | null;
  executions: number;
  successes: number;
  failures: number;
  latencyMs: number;
}
interface DashboardData {
  kpis: DashboardKpis;
  hasData: { leads: boolean; orders: boolean; customers: boolean };
  recentActivities: DashboardActivity[];
  recentOrders: unknown[];
  botStatuses: DashboardBot[];
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  lastSync: string | null;
  createdAt: string;
}
interface FunnelStage {
  id: string;
  name: string;
  code: string;
  order: number;
  type: string;
  createdAt: string;
}
interface FunnelRun {
  id: string;
  leadId: string;
  currentStage: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}
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
interface Lead {
  id: string;
  name: string;
  createdAt: string;
  [k: string]: unknown;
}

// ============================ Count-up hook ============================
function useCountUp(target: number, durationMs = 700): number {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!Number.isFinite(target) || target <= 0) {
      setVal(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

function CountUp({
  value,
  format,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const v = useCountUp(value);
  return <>{format ? format(v) : v.toLocaleString()}</>;
}

// ============================ Premium KPI card ============================
type KpiTone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "cyan"
  | "orange"
  | "rose"
  | "slate";

const KPI_TONE: Record<
  KpiTone,
  { tile: string; ring: string; glow: string; bar: string }
> = {
  blue: {
    tile: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    ring: "ring-blue-500/20",
    glow: "from-blue-500/10",
    bar: "bg-blue-500",
  },
  violet: {
    tile: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    ring: "ring-violet-500/20",
    glow: "from-violet-500/10",
    bar: "bg-violet-500",
  },
  emerald: {
    tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    glow: "from-emerald-500/10",
    bar: "bg-emerald-500",
  },
  amber: {
    tile: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    ring: "ring-amber-500/20",
    glow: "from-amber-500/10",
    bar: "bg-amber-500",
  },
  cyan: {
    tile: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    ring: "ring-cyan-500/20",
    glow: "from-cyan-500/10",
    bar: "bg-cyan-500",
  },
  orange: {
    tile: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
    ring: "ring-orange-500/20",
    glow: "from-orange-500/10",
    bar: "bg-orange-500",
  },
  rose: {
    tile: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    ring: "ring-rose-500/20",
    glow: "from-rose-500/10",
    bar: "bg-rose-500",
  },
  slate: {
    tile: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    ring: "ring-slate-500/20",
    glow: "from-slate-500/10",
    bar: "bg-slate-500",
  },
};

function PremiumKpi({
  label,
  value,
  icon: Icon,
  tone,
  subtitle,
  noData,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: KpiTone;
  subtitle?: string;
  noData?: boolean;
}) {
  const t = KPI_TONE[tone];
  return (
    <div
      className={cn(
        "glass gradient-card premium-shadow relative overflow-hidden rounded-xl p-4 ring-1",
        t.ring
      )}
    >
      {/* glow wash */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          t.glow
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {noData ? (
            <p className="text-sm italic text-muted-foreground/70">No data yet</p>
          ) : (
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              <CountUp value={value} />
            </p>
          )}
          {subtitle ? (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            t.tile
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className={cn("relative mt-3 h-1 w-full rounded-full bg-muted")}>
        <div className={cn("h-full w-1/3 rounded-full", t.bar)} />
      </div>
    </div>
  );
}

// Money KPI variant — supports displayCurrency conversion
function PremiumMoneyKpi({
  label,
  pkrValue,
  icon,
  tone,
  displayCurrency,
  subtitle,
  noData,
}: {
  label: string;
  pkrValue: number;
  icon: React.ElementType;
  tone: KpiTone;
  displayCurrency: Currency;
  subtitle?: string;
  noData?: boolean;
}) {
  const t = KPI_TONE[tone];
  const target =
    displayCurrency === "PKR"
      ? pkrValue
      : Math.round(convert(pkrValue, "PKR", displayCurrency));
  const v = useCountUp(target);
  const formatted = formatMoney(v, displayCurrency);
  return (
    <div
      className={cn(
        "glass gradient-card premium-shadow relative overflow-hidden rounded-xl p-4 ring-1",
        t.ring
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          t.glow
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {noData ? (
            <p className="text-sm italic text-muted-foreground/70">No data yet</p>
          ) : (
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatted}
            </p>
          )}
          {subtitle ? (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            t.tile
          )}
        >
          {React.createElement(icon, { className: "h-5 w-5" })}
        </span>
      </div>
      <div className={cn("relative mt-3 h-1 w-full rounded-full bg-muted")}>
        <div className={cn("h-full w-1/3 rounded-full", t.bar)} />
      </div>
    </div>
  );
}

// ============================ Section ============================
export function DashboardSection() {
  const displayCurrency = useDashboard((s) => s.displayCurrency);
  const setSection = useDashboard((s) => s.setSection);

  const {
    data,
    loading,
    error,
  } = useDashboardFetch<DashboardData>("/api/crm/dashboard");
  const { data: integrations } = useDashboardFetch<Integration[]>(
    "/api/crm/integrations"
  );
  const { data: bots } = useDashboardFetch<DashboardBot[]>("/api/crm/bots");
  const { data: stages } = useDashboardFetch<FunnelStage[]>(
    "/api/crm/funnels"
  );
  const { data: runs } = useDashboardFetch<FunnelRun[]>(
    "/api/crm/funnel-runs"
  );
  const { data: analytics } = useDashboardFetch<AnalyticsData>(
    "/api/crm/analytics"
  );
  const { data: leads } = useDashboardFetch<Lead[]>("/api/crm/leads?limit=200");

  const k = data?.kpis;
  const hasData = data?.hasData;
  const activities = data?.recentActivities ?? [];
  const botStatuses = bots ?? data?.botStatuses ?? [];

  // Leads by month (derive from leads list)
  const leadsByMonth = React.useMemo(() => {
    if (!leads || leads.length === 0) return [];
    const m: Record<string, number> = {};
    for (const l of leads) {
      const d = new Date(l.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[key] = (m[key] ?? 0) + 1;
    }
    return Object.entries(m)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [leads]);

  const revenueByMonth = analytics?.revenueByMonth ?? [];

  // Funnel stage counts (from runs)
  const stageCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of runs ?? []) {
      map[r.currentStage] = (map[r.currentStage] ?? 0) + 1;
    }
    return map;
  }, [runs]);

  if (error) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="Dashboard"
          description="Real-time control center for your CRM."
        />
        <EmptyState
          title="Couldn't load dashboard"
          description={error}
          icon={Cpu}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        description="Real-time control center for Playbeat CRM — premium overview of pipeline, revenue, automations and health."
        action={
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Premium
          </Badge>
        }
      />

      {/* ============ KPI grid ============ */}
      {loading && !data ? (
        <LoadingGrid count={8} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PremiumKpi
            label="Total Leads"
            value={k?.totalLeads ?? 0}
            icon={Users}
            tone="blue"
            subtitle={`${k?.newLeads ?? 0} new · ${k?.wonLeads ?? 0} won`}
            noData={hasData ? !hasData.leads : false}
          />
          <PremiumMoneyKpi
            label="Pipeline Value"
            pkrValue={k?.pipelineValuePkr ?? 0}
            icon={TrendingUp}
            tone="violet"
            displayCurrency={displayCurrency}
            subtitle="Open leads, in display currency"
            noData={hasData ? !hasData.leads : false}
          />
          <PremiumMoneyKpi
            label="Revenue"
            pkrValue={k?.revenuePkr ?? 0}
            icon={Banknote}
            tone="emerald"
            displayCurrency={displayCurrency}
            subtitle="Paid orders only"
            noData={hasData ? !hasData.orders : false}
          />
          <PremiumKpi
            label="Orders"
            value={k?.ordersCount ?? 0}
            icon={ShoppingCart}
            tone="amber"
            subtitle={`${k?.apiRunsToday ?? 0} API runs today`}
            noData={hasData ? !hasData.orders : false}
          />
          <PremiumKpi
            label="Customers"
            value={k?.customersCount ?? 0}
            icon={UserCheck}
            tone="cyan"
            subtitle="Lifetime customer records"
            noData={hasData ? !hasData.customers : false}
          />
          <PremiumKpi
            label="Active Bots"
            value={k?.activeBots ?? 0}
            icon={Bot}
            tone="orange"
            subtitle={`${k?.idleBots ?? 0} idle`}
            noData={botStatuses.length === 0}
          />
          <PremiumKpi
            label="Funnels Running"
            value={k?.funnelsRunning ?? 0}
            icon={Workflow}
            tone="rose"
            subtitle="Live funnel runs in progress"
            noData={k ? k.funnelsRunning === 0 : false}
          />
          <PremiumKpi
            label="Conversion Rate"
            value={
              typeof analytics?.conversionRate === "number"
                ? analytics.conversionRate
                : 0
            }
            icon={Percent}
            tone="slate"
            subtitle={
              analytics?.conversionRate === "no data"
                ? "Closed deals will appear here"
                : "Won / (won + lost)"
            }
            noData={analytics?.conversionRate === "no data"}
          />
        </div>
      )}

      {/* ============ Charts ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading && !analytics ? (
          <ChartSkeleton height={240} />
        ) : (
          <ChartCard
            title="Revenue (PKR)"
            description={`Paid orders by month, in ${displayCurrency}.`}
            noData={revenueByMonth.length === 0}
          >
            <RevenueChart
              data={revenueByMonth.map((r) => ({
                month: r.month,
                value:
                  displayCurrency === "PKR"
                    ? r.revenue
                    : Math.round(convert(r.revenue, "PKR", displayCurrency)),
              }))}
              currency={displayCurrency}
            />
          </ChartCard>
        )}

        {loading && !leads ? (
          <ChartSkeleton height={240} />
        ) : (
          <ChartCard
            title="Leads"
            description="New leads created per month."
            noData={leadsByMonth.length === 0}
          >
            <LeadsChart data={leadsByMonth} />
          </ChartCard>
        )}
      </div>

      {/* ============ Funnel + Bots ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="glass card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4 text-primary" />
              Funnel Visualization
            </CardTitle>
            <CardDescription>
              Lead flow across pipeline stages. Counts reflect active funnel runs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !stages ? (
              <Skeleton className="h-28 w-full" />
            ) : !stages || stages.length === 0 ? (
              <EmptyState
                title="No funnel stages yet"
                description="Configure your funnel stages in the Funnels section to visualize lead flow."
                icon={Workflow}
                action={
                  <button
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    onClick={() => setSection("funnels")}
                  >
                    Open Funnels <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ) : (
              <FunnelFlow stages={stages} counts={stageCounts} />
            )}
          </CardContent>
        </Card>

        <Card className="glass card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Bot Status
            </CardTitle>
            <CardDescription>
              Live automation workers. Honest status — all idle until executed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !bots ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : botStatuses.length === 0 ? (
              <EmptyState
                title="No bots registered"
                description="Provision bots in the Bots section to enable automated workers."
                icon={Bot}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {botStatuses.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground capitalize">
                        {b.role}
                        {b.currentJob ? ` · ${b.currentJob}` : ""}
                      </p>
                    </div>
                    <BotStatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ Activity + Integrations ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="glass card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ActivityIcon className="h-4 w-4 text-primary" />
              Activity Stream
            </CardTitle>
            <CardDescription>
              Recent events across leads, contacts and accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !data ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Create leads, contacts or accounts — events will stream here in real time."
                icon={ActivityIcon}
              />
            ) : (
              <ScrollArea className="h-72 pr-3">
                <ol className="relative space-y-3 border-l border-border/60 pl-4">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[19px] top-1.5 flex h-2.5 w-2.5 items-center justify-center">
                        <CircleDot className="h-2.5 w-2.5 text-primary" />
                      </span>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm">{a.description}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {a.type.replace(/_/g, " ")}
                            {a.lead?.name ? ` · ${a.lead.name}` : ""}
                            {a.contact
                              ? ` · ${a.contact.firstName} ${a.contact.lastName}`
                              : ""}
                            {a.account?.name ? ` · ${a.account.name}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="glass card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4 text-primary" />
              API Health
            </CardTitle>
            <CardDescription>
              Integration connection status (honest — disconnected by default).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !integrations ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !integrations || integrations.length === 0 ? (
              <EmptyState
                title="No integrations yet"
                description="Connect Google, Facebook, WhatsApp and more in the Integrations section."
                icon={Plug}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {integrations.map((it) => {
                  const ok = it.status === "connected";
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{it.name}</p>
                        <p className="truncate text-xs text-muted-foreground capitalize">
                          {it.type}
                          {it.lastSync
                            ? ` · synced ${timeAgo(it.lastSync)}`
                            : " · never synced"}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            ok
                              ? "bg-emerald-500 pulse-dot"
                              : it.status === "error"
                                ? "bg-rose-500"
                                : "bg-slate-400"
                          )}
                        />
                        <span
                          className={cn(
                            ok
                              ? "text-emerald-600 dark:text-emerald-400"
                              : it.status === "error"
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {it.status}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Honest helper note */}
      <p className="text-center text-xs text-muted-foreground/70">
        Dashboard reflects live CRM data · {formatDate(new Date().toISOString())}{" "}
        · No mock values shown
      </p>
    </div>
  );
}

// ============================ Revenue chart ============================
function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; value: number }[];
  currency: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
          }
        />
        <RTooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
          formatter={(v: number) => [formatMoney(v, currency), "Revenue"]}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#revGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================ Leads chart ============================
function LeadsChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <RTooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
          formatter={(v: number) => [v, "Leads"]}
          labelStyle={{ color: "var(--muted-foreground)" }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#leadsGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================ Funnel flow viz ============================
function FunnelFlow({
  stages,
  counts,
}: {
  stages: FunnelStage[];
  counts: Record<string, number>;
}) {
  const total = stages.length;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {stages.map((s, i) => {
        const c = counts[s.code] ?? 0;
        return (
          <React.Fragment key={s.id}>
            <div className="flex min-w-[110px] flex-col items-center gap-1 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {i + 1} / {total}
              </span>
              <span className="text-sm font-medium leading-tight">{s.name}</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {c}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {s.type}
              </span>
            </div>
            {i < stages.length - 1 ? (
              <div className="flex items-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}


