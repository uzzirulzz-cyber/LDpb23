"use client";

import * as React from "react";
import {
  DollarSign,
  Users,
  Wallet,
  TrendingUp,
  Building2,
  Calculator,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  KpiCard,
  ChartCard,
  LoadingGrid,
  ChartSkeleton,
  EmptyState,
} from "../shared";
import { MiniAvatar } from "../ui-helpers";

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
} from "recharts";

// ============================ Types ============================
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  status: string;
  salary: number;
  currency: string;
  hireDate: string | null;
}

// ============================ Section ============================
export function EmpPayrollSection() {
  const { data: employees, loading, error } = useDashboardFetch<Employee[]>(
    "/api/crm/employees"
  );
  const displayCurrency = useDashboard((s) => s.displayCurrency);

  // Convert each employee's salary to display currency, then sum.
  const converted = React.useMemo(() => {
    return (employees ?? []).map((e) => {
      const cur = (e.currency as Currency) ?? "PKR";
      const inDisplay = convert(e.salary, cur, displayCurrency);
      return { ...e, salaryDisplay: inDisplay, sourceCur: cur };
    });
  }, [employees, displayCurrency]);

  const kpis = React.useMemo(() => {
    if (converted.length === 0) return null;
    const total = converted.reduce((s, e) => s + e.salaryDisplay, 0);
    const active = converted.filter((e) => e.status === "active");
    const activeTotal = active.reduce((s, e) => s + e.salaryDisplay, 0);
    const avg = converted.length > 0 ? total / converted.length : 0;
    return {
      totalMonthly: total,
      activeMonthly: activeTotal,
      avgSalary: avg,
      headcount: converted.length,
      activeCount: active.length,
    };
  }, [converted]);

  // Group by department
  const byDept = React.useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const e of converted) {
      const key = e.department ?? "Unassigned";
      const cur = m.get(key) ?? { total: 0, count: 0 };
      cur.total += e.salaryDisplay;
      cur.count += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([dept, v]) => ({ dept, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);
  }, [converted]);

  const chartData = React.useMemo(
    () => byDept.map((d) => ({ dept: d.dept, total: Math.round(d.total) })),
    [byDept]
  );

  const fmt = React.useCallback(
    (n: number) => formatMoney(n, displayCurrency),
    [displayCurrency]
  );

  const hasData = (employees?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Payroll"
        description="Total monthly salary spend by department, employee salary list, and payroll KPIs. Salaries converted to display currency."
      />

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading payroll: {error}
        </div>
      ) : loading ? (
        <LoadingGrid count={4} />
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Total Monthly Payroll"
            value={kpis ? fmt(kpis.totalMonthly) : "—"}
            icon={Wallet}
            tone="violet"
            noData={!hasData}
          />
          <KpiCard
            label="Active Monthly"
            value={kpis ? fmt(kpis.activeMonthly) : "—"}
            icon={DollarSign}
            tone="emerald"
            noData={!hasData}
          />
          <KpiCard
            label="Avg Salary"
            value={kpis ? fmt(kpis.avgSalary) : "—"}
            icon={TrendingUp}
            tone="blue"
            noData={!hasData}
          />
          <KpiCard
            label="Headcount"
            value={kpis?.headcount ?? 0}
            icon={Users}
            tone="amber"
            noData={!hasData}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <ChartSkeleton height={260} />
        ) : (
          <ChartCard
            title="Payroll by Department"
            description={`Monthly total in ${displayCurrency}`}
            noData={!hasData}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => {
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                    return String(v);
                  }} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmt(v), "Total"]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        <div className="space-y-3">
          <div className="glass rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-500" /> Department Summary
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : byDept.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No departments yet.</p>
              ) : (
                byDept.map((d) => (
                  <div key={d.dept} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b last:border-0">
                    <div>
                      <span className="font-medium capitalize">{d.dept}</span>
                      <span className="text-xs text-muted-foreground ml-2">{d.count} {d.count === 1 ? "person" : "people"}</span>
                    </div>
                    <span className="tabular-nums font-medium">{fmt(d.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-500" /> Employee Salary List
          </h3>
        </div>
        {loading ? (
          <div className="p-4"><Skeleton className="h-32 w-full" /></div>
        ) : !hasData ? (
          <div className="p-4">
            <EmptyState
              icon={Wallet}
              title="No employees on payroll"
              description="Add employees from the Employee Directory — their salaries appear here automatically."
              className="py-8"
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source Salary</TableHead>
                <TableHead className="text-right">In {displayCurrency}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {converted.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MiniAvatar name={e.name} size={28} />
                      <div>
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{e.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{e.department ?? "—"}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                      e.status === "active"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : e.status === "on_leave"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                        : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                    )}>
                      {e.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatMoney(e.salary, e.sourceCur)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(e.salaryDisplay)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
