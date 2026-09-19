"use client";

import * as React from "react";
import {
  TrendingUp,
  Users,
  Award,
  Target,
  CheckCircle2,
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
  PieChart,
  Pie,
  Cell,
  Legend,
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
}

interface AttendanceRow {
  id: string;
  employeeId: string;
  status: string; // present | absent | late | half_day | leave
  date: string;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];

// ============================ Helpers ============================
function ratePct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

// ============================ Section ============================
export function EmpPerformanceSection() {
  const { data: employees, loading: empLoading, error: empErr } =
    useDashboardFetch<Employee[]>("/api/crm/employees");
  const { data: attendance, loading: attLoading } =
    useDashboardFetch<AttendanceRow[]>("/api/crm/attendance");

  const loading = empLoading || attLoading;

  // Attendance rate per employee
  const attendanceByEmployee = React.useMemo(() => {
    const m = new Map<string, { present: number; late: number; half: number; absent: number; leave: number; total: number }>();
    for (const a of attendance ?? []) {
      const cur = m.get(a.employeeId) ?? { present: 0, late: 0, half: 0, absent: 0, leave: 0, total: 0 };
      cur.total += 1;
      if (a.status === "present") cur.present += 1;
      else if (a.status === "late") cur.late += 1;
      else if (a.status === "half_day") cur.half += 1;
      else if (a.status === "absent") cur.absent += 1;
      else if (a.status === "leave") cur.leave += 1;
      m.set(a.employeeId, cur);
    }
    return m;
  }, [attendance]);

  // Overall KPIs
  const kpis = React.useMemo(() => {
    const allEmps = employees ?? [];
    const active = allEmps.filter((e) => e.status === "active").length;
    const allAtt = attendance ?? [];
    const presentCount = allAtt.filter((a) => a.status === "present").length;
    const lateCount = allAtt.filter((a) => a.status === "late").length;
    const halfCount = allAtt.filter((a) => a.status === "half_day").length;
    const absentCount = allAtt.filter((a) => a.status === "absent").length;
    const leaveCount = allAtt.filter((a) => a.status === "leave").length;
    const totalRecords = allAtt.length;
    // Attendance rate = (present + late + half_day * 0.5) / total
    const effective = presentCount + lateCount + halfCount * 0.5;
    const rate = totalRecords > 0 ? Math.round((effective / totalRecords) * 100) : 0;
    return {
      headcount: allEmps.length,
      active,
      attendanceRate: rate,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
    };
  }, [employees, attendance]);

  // Headcount by department
  const byDept = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const e of employees ?? []) {
      const k = e.department ?? "Unassigned";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // Headcount by role
  const byRole = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const e of employees ?? []) {
      m.set(e.role, (m.get(e.role) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  const rolePieData = byRole.map((r, i) => ({ name: r.role, value: r.count, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  const deptBarData = byDept.map((d) => ({ dept: d.dept, count: d.count }));

  // Per-employee performance table (top 10 by attendance rate)
  const perEmployee = React.useMemo(() => {
    return (employees ?? [])
      .map((e) => {
        const stats = attendanceByEmployee.get(e.id) ?? { present: 0, late: 0, half: 0, absent: 0, leave: 0, total: 0 };
        const effective = stats.present + stats.late + stats.half * 0.5;
        const rate = stats.total > 0 ? Math.round((effective / stats.total) * 100) : null;
        return { ...e, ...stats, rate };
      })
      .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  }, [employees, attendanceByEmployee]);

  const hasEmps = (employees?.length ?? 0) > 0;
  const hasAtt = (attendance?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Performance Reviews"
        description="Team performance overview: headcount distribution, attendance rates, and per-employee performance based on real attendance data."
      />

      {empErr ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading performance data: {empErr}
        </div>
      ) : loading ? (
        <LoadingGrid count={4} />
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Headcount" value={kpis.headcount} icon={Users} tone="blue" noData={!hasEmps} />
          <KpiCard label="Active" value={kpis.active} icon={CheckCircle2} tone="emerald" noData={!hasEmps} />
          <KpiCard
            label="Attendance Rate"
            value={hasAtt ? `${kpis.attendanceRate}%` : "—"}
            icon={Target}
            tone="violet"
            noData={!hasAtt}
          />
          <KpiCard
            label="Attendance Records"
            value={kpis.totalRecords}
            icon={Award}
            tone="amber"
            noData={!hasAtt}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {empLoading ? (
          <ChartSkeleton height={260} />
        ) : (
          <ChartCard
            title="Headcount by Department"
            description="Distribution of employees across departments"
            noData={!hasEmps}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBarData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {empLoading ? (
          <ChartSkeleton height={260} />
        ) : (
          <ChartCard
            title="Headcount by Role"
            description="Role distribution across the team"
            noData={!hasEmps}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {rolePieData.map((entry, i) => (
                      <Cell key={`r-${i}`} fill={entry.fill} />
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
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      <div className="glass rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Per-Employee Performance
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attendance rate = (present + late + half_day × 0.5) / total records. Sorted by rate (highest first).
          </p>
        </div>
        {empLoading || attLoading ? (
          <div className="p-4"><Skeleton className="h-48 w-full" /></div>
        ) : perEmployee.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Award}
              title="No employees to evaluate"
              description="Add employees and start recording attendance — performance scores appear here automatically."
              className="py-8"
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Late</TableHead>
                <TableHead className="text-center">Half Day</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead className="text-center">Leave</TableHead>
                <TableHead className="text-right">Attendance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perEmployee.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MiniAvatar name={e.name} size={28} />
                      <div>
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{e.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{e.department ?? "—"}</TableCell>
                  <TableCell className="text-center tabular-nums text-sm">{e.present}</TableCell>
                  <TableCell className="text-center tabular-nums text-sm text-amber-600 dark:text-amber-400">{e.late}</TableCell>
                  <TableCell className="text-center tabular-nums text-sm text-cyan-600 dark:text-cyan-400">{e.half}</TableCell>
                  <TableCell className="text-center tabular-nums text-sm text-rose-600 dark:text-rose-400">{e.absent}</TableCell>
                  <TableCell className="text-center tabular-nums text-sm text-violet-600 dark:text-violet-400">{e.leave}</TableCell>
                  <TableCell className="text-right">
                    {e.rate === null ? (
                      <span className="text-xs text-muted-foreground italic">No records</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              e.rate >= 90 ? "bg-emerald-500" : e.rate >= 75 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${e.rate}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-sm font-medium w-10 text-right">{e.rate}%</span>
                      </div>
                    )}
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
