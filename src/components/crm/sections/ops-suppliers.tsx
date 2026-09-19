"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  Globe,
  Loader2,
  Trash2,
  Pencil,
  Package,
  Wrench,
  Server,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  KpiCard,
  EmptyState,
} from "../shared";
import { timeAgo } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  category: string | null; // digital | hardware | service
  status: string; // active | inactive
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  digital: { label: "Digital", icon: Server, className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  hardware: { label: "Hardware", icon: Package, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" },
  service: { label: "Service", icon: Wrench, className: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20" },
};

// ============================ Section ============================
export function OpsSuppliersSection() {
  const { data: suppliers, loading, error } = useDashboardFetch<Supplier[]>(
    "/api/crm/suppliers"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("none");
  const [statusFilter, setStatusFilter] = React.useState<string>("none");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);

  const kpis = React.useMemo(() => {
    const all = suppliers ?? [];
    return {
      total: all.length,
      active: all.filter((s) => s.status === "active").length,
      digital: all.filter((s) => s.category === "digital").length,
      hardware: all.filter((s) => s.category === "hardware").length,
    };
  }, [suppliers]);

  const filtered = React.useMemo(() => {
    if (!suppliers) return [];
    return suppliers.filter((s) => {
      if (categoryFilter !== "none" && s.category !== categoryFilter) return false;
      if (statusFilter !== "none" && s.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [s.name, s.contactName ?? "", s.email ?? "", s.country ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, categoryFilter, statusFilter, search]);

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      const res = await fetch(`/api/crm/suppliers/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Supplier deleted");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Suppliers & Vendors"
        description="Vendor directory for digital, hardware, and service suppliers. Add contacts, filter by category."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Supplier
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard label="Total Suppliers" value={kpis.total} icon={Building2} tone="violet" noData={!suppliers} />
        <KpiCard label="Active" value={kpis.active} icon={Building2} tone="emerald" noData={!suppliers} />
        <KpiCard label="Digital" value={kpis.digital} icon={Server} tone="blue" noData={!suppliers} />
        <KpiCard label="Hardware" value={kpis.hardware} icon={Package} tone="amber" noData={!suppliers} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, contact, email, country..."
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-[160px] w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All categories</SelectItem>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[140px] w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading suppliers: {error}
        </div>
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description="Add your first supplier to start tracking vendor relationships. Seeded suppliers (Steam, Netflix, Adobe, etc.) appear here automatically."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const meta = s.category ? CATEGORY_META[s.category] : null;
            const Icon = meta?.icon ?? Building2;
            return (
              <Card key={s.id} className="card-shadow">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        meta?.className ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300"
                      )}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.contactName ?? "No contact name"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditing(s)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-600 hover:text-rose-700"
                        onClick={() => handleDelete(s)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {s.email ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    ) : null}
                    {s.phone ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{s.phone}</span>
                      </div>
                    ) : null}
                    {s.country ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        <span>{s.country}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    {meta ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                        meta.className
                      )}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No category</span>
                    )}
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      s.status === "active"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                    )}>
                      {s.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SupplierFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editing={null}
        onSaved={() => triggerRefresh()}
      />
      <SupplierFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        editing={editing}
        onSaved={() => {
          setEditing(null);
          triggerRefresh();
        }}
      />
    </div>
  );
}

// ============================ Supplier Form Dialog (Add/Edit) ============================
function SupplierFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Supplier | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [category, setCategory] = React.useState<string>("none");
  const [status, setStatus] = React.useState<string>("active");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setName(editing.name);
      setContactName(editing.contactName ?? "");
      setEmail(editing.email ?? "");
      setPhone(editing.phone ?? "");
      setCountry(editing.country ?? "");
      setCategory(editing.category ?? "none");
      setStatus(editing.status ?? "active");
    } else if (open) {
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCountry("");
      setCategory("none");
      setStatus("active");
    }
  }, [editing, open]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        category: category === "none" ? null : category,
        status,
      };
      const url = editing ? `/api/crm/suppliers/${editing.id}` : "/api/crm/suppliers";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(editing ? "Supplier updated" : "Supplier added");
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
          <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update vendor information." : "Register a new vendor or supplier."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sn">Name *</Label>
            <Input id="sn" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cn">Contact name</Label>
              <Input id="cn" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ph">Phone</Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co">Country</Label>
              <Input id="co" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="st"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {editing ? "Save changes" : "Add supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
