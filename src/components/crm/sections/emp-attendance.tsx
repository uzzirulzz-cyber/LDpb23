"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  LogIn,
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
import { MiniAvatar, formatDate } from "../ui-helpers";

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
interface AttendanceEmployee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: string;
}

interface AttendanceRow {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string; // present | absent | late | half_day | leave
  notes: string | null;
  createdAt: string;
  employee?: AttendanceEmployee;
}

const STATUS_OPTIONS = ["present", "absent", "late", "half_day", "leave"] as const;

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  absent: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  late: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  half_day: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  leave: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
};

function Pill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_COLORS[label] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label.replace("_", " ")}
    </span>
  );
}

function timeOfDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
}

// ============================ Section ============================
export function EmpAttendanceSection() {
  const { data: attendance, loading, error } = useDashboardFetch<AttendanceRow[]>(
    "/api/crm/attendance"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [dateFilter, setDateFilter] = React.useState<string>("");
  const [markOpen, setMarkOpen] = React.useState(false);

  const kpis = React.useMemo(() => {
    const all = attendance ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todays = all.filter((a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    return {
      total: all.length,
      today: todays.length,
      presentToday: todays.filter((a) => a.status === "present").length,
      lateToday: todays.filter((a) => a.status === "late").length,
    };
  }, [attendance]);

  const filtered = React.useMemo(() => {
    if (!attendance) return [];
    return attendance.filter((a) => {
      if (statusFilter !== "none" && a.status !== statusFilter) return false;
      if (dateFilter) {
        const d = new Date(a.date);
        const f = new Date(dateFilter);
        if (
          d.getFullYear() !== f.getFullYear() ||
          d.getMonth() !== f.getMonth() ||
          d.getDate() !== f.getDate()
        ) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [a.employee?.name ?? "", a.employee?.email ?? "", a.notes ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attendance, statusFilter, dateFilter, search]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Attendance & Timesheets"
        description="Daily attendance log. Mark check-in / check-out, status, and notes. Filter by date or status."
        action={
          <Button onClick={() => setMarkOpen(true)}>
            <LogIn className="h-4 w-4 mr-1" /> Mark Attendance
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total Records" value={kpis.total} icon={Calendar} tone="blue" noData={!attendance} />
        <KpiCard label="Today's Records" value={kpis.today} icon={Clock} tone="violet" noData={!attendance} />
        <KpiCard label="Present Today" value={kpis.presentToday} icon={CheckCircle2} tone="emerald" noData={!attendance} />
        <KpiCard label="Late Today" value={kpis.lateToday} icon={Clock} tone="amber" noData={!attendance} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, email, notes..."
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="sm:w-[180px] w-full"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[160px] w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading attendance: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No attendance records yet"
          description="Use 'Mark Attendance' to log check-ins. Records appear here for daily review and timesheet exports."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MiniAvatar name={a.employee?.name ?? "?"} size={28} />
                      <div>
                        <div className="font-medium text-sm">{a.employee?.name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {a.employee?.department ?? "—"} · {a.employee?.role ?? "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{timeOfDay(a.checkIn)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{timeOfDay(a.checkOut)}</TableCell>
                  <TableCell><Pill label={a.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                    {a.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MarkAttendanceDialog
        open={markOpen}
        onOpenChange={setMarkOpen}
        onSaved={() => triggerRefresh()}
      />
    </div>
  );
}

// ============================ Mark Attendance Dialog ============================
function MarkAttendanceDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { data: employees } = useDashboardFetch<Array<{ id: string; name: string; email: string; department: string | null }>>(
    "/api/crm/employees"
  );
  const [employeeId, setEmployeeId] = React.useState<string>("none");
  const [date, setDate] = React.useState<string>("");
  const [checkIn, setCheckIn] = React.useState<string>("");
  const [checkOut, setCheckOut] = React.useState<string>("");
  const [status, setStatus] = React.useState<string>("present");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10);
      setDate(iso);
      setEmployeeId("none");
      setCheckIn("");
      setCheckOut("");
      setStatus("present");
      setNotes("");
    }
  }, [open]);

  const submit = async () => {
    if (employeeId === "none") {
      toast.error("Select an employee");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        employeeId,
        date,
        status,
        notes: notes.trim() || null,
      };
      if (checkIn) {
        // Combine date + time
        body.checkIn = new Date(`${date}T${checkIn}`).toISOString();
      }
      if (checkOut) {
        body.checkOut = new Date(`${date}T${checkOut}`).toISOString();
      }
      const res = await fetch("/api/crm/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Attendance recorded");
      onOpenChange(false);
      onSaved();
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
          <DialogTitle>Mark attendance</DialogTitle>
          <DialogDescription>
            Log a daily attendance record. Set check-in / check-out times, status, and notes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ae">Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="ae"><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {(employees ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} {e.department ? `· ${e.department}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ad">Date *</Label>
              <Input id="ad" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="as">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="as"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci">Check-in</Label>
              <Input id="ci" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co">Check-out</Label>
              <Input id="co" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="an">Notes</Label>
            <Input id="an" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
            Record attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
