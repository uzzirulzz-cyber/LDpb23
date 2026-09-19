"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Users,
  Mail,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  KpiCard,
  EmptyState,
} from "../shared";
import { MiniAvatar, timeAgo, formatDate } from "../ui-helpers";

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
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string; // admin | manager | sales | ops | support | staff
  department: string | null; // sales | ops | support | finance | tech
  status: string; // active | on_leave | inactive
  salary: number;
  currency: string;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_OPTIONS = ["admin", "manager", "sales", "ops", "support", "staff"] as const;
const DEPARTMENT_OPTIONS = ["sales", "ops", "support", "finance", "tech"] as const;
const STATUS_OPTIONS = ["active", "on_leave", "inactive"] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  manager: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  sales: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  ops: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  support: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  staff: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  on_leave: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  inactive: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

function Pill({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        colorMap[label] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label.replace("_", " ")}
    </span>
  );
}

// ============================ Section ============================
export function EmpDirectorySection() {
  const { data: employees, loading, error } = useDashboardFetch<Employee[]>(
    "/api/crm/employees"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("none");
  const [deptFilter, setDeptFilter] = React.useState<string>("none");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Employee | null>(null);

  const kpis = React.useMemo(() => {
    const all = employees ?? [];
    return {
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      onLeave: all.filter((e) => e.status === "on_leave").length,
      departments: new Set(all.map((e) => e.department).filter(Boolean)).size,
    };
  }, [employees]);

  const filtered = React.useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => {
      if (roleFilter !== "none" && e.role !== roleFilter) return false;
      if (deptFilter !== "none" && e.department !== deptFilter) return false;
      if (statusFilter !== "none" && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [e.name, e.email, e.phone ?? "", e.role, e.department ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, roleFilter, deptFilter, statusFilter, search]);

  const handleDelete = async (e: Employee) => {
    if (!confirm(`Delete employee "${e.name}"? This also deletes their attendance records.`)) return;
    try {
      const res = await fetch(`/api/crm/employees/${e.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Employee deleted");
      triggerRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Employee Directory"
        description="All employees: roles, departments, salaries, status. Add, edit, remove team members."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Headcount" value={kpis.total} icon={Users} tone="blue" noData={!employees} />
        <KpiCard label="Active" value={kpis.active} icon={Users} tone="emerald" noData={!employees} />
        <KpiCard label="On Leave" value={kpis.onLeave} icon={Users} tone="amber" noData={!employees} />
        <KpiCard label="Departments" value={kpis.departments} icon={Users} tone="violet" noData={!employees} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, role..."
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-[160px] w-full"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All roles</SelectItem>
            {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="sm:w-[160px] w-full"><SelectValue placeholder="All depts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All departments</SelectItem>
            {DEPARTMENT_OPTIONS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[140px] w-full"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading employees: {error}
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add your first team member. Employees drive attendance, payroll, and performance modules."
        />
      ) : (
        <div className="glass rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const cur = (e.currency as Currency) ?? "PKR";
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <MiniAvatar name={e.name} size={32} />
                        <div>
                          <div className="font-medium text-sm">{e.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{e.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Pill label={e.role} colorMap={ROLE_COLORS} /></TableCell>
                    <TableCell className="text-sm capitalize">{e.department ?? "—"}</TableCell>
                    <TableCell><Pill label={e.status} colorMap={STATUS_COLORS} /></TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(e.salary, cur)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.hireDate ? formatDate(e.hireDate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(e)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => handleDelete(e)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <EmployeeFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editing={null}
        onSaved={() => triggerRefresh()}
      />
      <EmployeeFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        editing={editing}
        onSaved={() => { setEditing(null); triggerRefresh(); }}
      />
    </div>
  );
}

// ============================ Employee Form Dialog ============================
function EmployeeFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Employee | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<string>("staff");
  const [department, setDepartment] = React.useState<string>("none");
  const [status, setStatus] = React.useState<string>("active");
  const [salary, setSalary] = React.useState("");
  const [currency, setCurrency] = React.useState<string>("PKR");
  const [hireDate, setHireDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setName(editing.name);
      setEmail(editing.email);
      setPhone(editing.phone ?? "");
      setRole(editing.role);
      setDepartment(editing.department ?? "none");
      setStatus(editing.status);
      setSalary(String(editing.salary ?? 0));
      setCurrency(editing.currency ?? "PKR");
      setHireDate(editing.hireDate ? editing.hireDate.slice(0, 10) : "");
    } else if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setRole("staff");
      setDepartment("none");
      setStatus("active");
      setSalary("");
      setCurrency("PKR");
      setHireDate("");
    }
  }, [editing, open]);

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role,
        department: department === "none" ? null : department,
        status,
        salary: salary.trim() === "" ? 0 : Number(salary),
        currency,
        hireDate: hireDate || null,
      };
      const url = editing ? `/api/crm/employees/${editing.id}` : "/api/crm/employees";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(editing ? "Employee updated" : "Employee added");
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
          <DialogTitle>{editing ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update employee profile." : "Register a new team member."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="en">Name *</Label>
              <Input id="en" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ee">Email *</Label>
              <Input id="ee" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep">Phone</Label>
              <Input id="ep" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="er">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="er"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="ed"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {DEPARTMENT_OPTIONS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="es"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa">Salary</Label>
              <Input id="sa" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="cu"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PKR">PKR (₨)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="hd">Hire date</Label>
              <Input id="hd" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {editing ? "Save changes" : "Add employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
