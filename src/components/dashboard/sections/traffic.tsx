"use client";

import { useMemo } from "react";
import { SectionHeader, KpiCard, ChartCard, LoadingGrid } from "../shared";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { timeAgo } from "../ui-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  MousePointerClick,
  Clock,
} from "lucide-react";

interface DailyEntry {
  date: string;
  visits: number;
  unique: number;
}
interface BySource {
  source: string;
  count: number;
}
interface TopPage {
  path: string;
  count: number;
}
interface ByCountry {
  country: string;
  count: number;
}
interface ByDevice {
  device: string;
  count: number;
}
interface RecentVisit {
  id: string;
  path: string;
  source: string;
  country: string;
  device: string;
  sessionId: string;
  durationSec: number;
  createdAt: string;
}

interface TrafficData {
  total: number;
  daily: DailyEntry[];
  bySource: BySource[];
  topPages: TopPage[];
  byCountry: ByCountry[];
  byDevice: ByDevice[];
  avgDuration: number;
  bounceRate: number;
  recent: RecentVisit[];
}

const SOURCE_COLORS: Record<string, string> = {
  direct: "#64748b", // slate
  organic: "#10b981", // emerald
  referral: "#3b82f6", // blue
  social: "#8b5cf6", // violet
  ads: "#f59e0b", // amber
  email: "#06b6d4", // cyan
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  organic: "Organic",
  referral: "Referral",
  social: "Social",
  ads: "Ads",
  email: "Email",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#3b82f6",
  mobile: "#10b981",
  tablet: "#f59e0b",
};

function sourceColor(s: string): string {
  return SOURCE_COLORS[s] ?? "#64748b";
}
function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}
function deviceLabel(d: string): string {
  return DEVICE_LABELS[d] ?? d;
}
function deviceColor(d: string): string {
  return DEVICE_COLORS[d] ?? "#64748b";
}

function formatDuration(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function SourceBadge({ source }: { source: string }) {
  const color = sourceColor(source);
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-transparent"
      style={{ backgroundColor: color + "1a", color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {sourceLabel(source)}
    </Badge>
  );
}

function DeviceIcon({ device }: { device: string }) {
  const cls = "h-4 w-4";
  if (device === "mobile") return <Smartphone className={cls} />;
  if (device === "tablet") return <Tablet className={cls} />;
  return <Monitor className={cls} />;
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export function TrafficSection() {
  const { data, loading, error } = useDashboardFetch<TrafficData>("/api/traffic");

  const lastDayUnique = useMemo(() => {
    const arr = data?.daily ?? [];
    if (arr.length === 0) return 0;
    return arr[arr.length - 1].unique;
  }, [data]);

  const recent = data?.recent ?? [];
  const daily = data?.daily ?? [];
  const bySource = data?.bySource ?? [];
  const topPages = data?.topPages ?? [];
  const byCountry = data?.byCountry ?? [];
  const byDevice = data?.byDevice ?? [];

  const topPagesHeight = Math.max(220, topPages.length * 36);
  const byCountryHeight = Math.max(220, byCountry.length * 36);

  return (
    <div>
      <SectionHeader
        title="Analytics & Traffic"
        description="Real-time visitor analytics for playbeat.digital"
      />

      {loading && <LoadingGrid count={4} />}

      {error && !loading && (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600 dark:text-rose-400">
            Failed to load traffic data: {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Visits"
              value={data.total.toLocaleString()}
              icon={MousePointerClick}
              tone="primary"
              footer="All-time sessions"
            />
            <KpiCard
              label="Unique (last 24h)"
              value={lastDayUnique.toLocaleString()}
              icon={Users}
              tone="success"
              footer="Distinct visitors"
            />
            <KpiCard
              label="Avg Duration"
              value={formatDuration(data.avgDuration)}
              icon={Clock}
              tone="default"
              footer="Per session"
            />
            <KpiCard
              label="Bounce Rate"
              value={`${data.bounceRate.toFixed(1)}%`}
              icon={TrendingUp}
              tone="warning"
              footer="Single-page sessions"
            />
          </div>

          <ChartCard
            title="Visits Trend"
            description="Daily visits & unique visitors"
            className="mb-4"
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daily} margin={{ left: -16, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="g-visits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-unique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#g-visits)"
                  name="Visits"
                />
                <Area
                  type="monotone"
                  dataKey="unique"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#g-unique)"
                  name="Unique"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Traffic by Source"
              description="Where your visitors come from"
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={bySource}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {bySource.map((entry, i) => (
                      <Cell key={i} fill={sourceColor(entry.source)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => sourceLabel(String(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By Device" description="Visitor device breakdown">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byDevice}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byDevice.map((entry, i) => (
                      <Cell key={i} fill={deviceColor(entry.device)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => deviceLabel(String(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Top Pages" description="Most visited paths">
              <ResponsiveContainer width="100%" height={topPagesHeight}>
                <BarChart
                  data={topPages}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="path"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="By Country" description="Visitor geography">
              <ResponsiveContainer width="100%" height={byCountryHeight}>
                <BarChart
                  data={byCountry}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="country"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card className="card-shadow overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[180px]">Path</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No recent visits.
                      </TableCell>
                    </TableRow>
                  )}
                  {recent.map((v) => (
                    <TableRow
                      key={v.id}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <TableCell>
                        <a
                          href={`https://playbeat.digital${v.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {v.path}
                        </a>
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={v.source} />
                      </TableCell>
                      <TableCell className="text-sm">{v.country}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DeviceIcon device={v.device} />
                          {deviceLabel(v.device)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">
                        {formatDuration(v.durationSec)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {timeAgo(v.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
