"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  Loader2,
} from "lucide-react";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { Lead, Rep } from "@/lib/types";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/types";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { useDashboard } from "@/lib/store";
import { SectionHeader } from "../shared";
import {
  MiniAvatar,
  ScoreBadge,
  SourceBadge,
  StatusBadge,
  STATUS_META,
  timeAgo,
} from "../ui-helpers";
import { toast } from "sonner";

interface NewLeadForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  value: string;
}

const EMPTY_FORM: NewLeadForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "website",
  value: "",
};

export function LeadsSection() {
  const displayCurrency = useDashboard((s) => s.displayCurrency) as Currency;
  const setSelectedLeadId = useDashboard((s) => s.setSelectedLeadId);
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const { data: leads, loading } = useDashboardFetch<Lead[]>(
    "/api/leads?limit=200"
  );
  const { data: reps } = useDashboardFetch<Rep[]>("/api/reps");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [repFilter, setRepFilter] = useState<string>("all");

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewLeadForm>(EMPTY_FORM);

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (source !== "all" && l.source !== source) return false;
      if (repFilter !== "all" && l.assignedTo !== repFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company ?? "").toLowerCase().includes(q) ||
          l.phone.includes(q)
        );
      }
      return true;
    });
  }, [leads, status, source, repFilter, search]);

  const totalPipelineUsd = filtered.reduce(
    (s, l) =>
      l.status !== "won" && l.status !== "lost"
        ? s + convert(l.value, l.currency as Currency, "USD")
        : s,
    0
  );

  const resetForm = () => setForm(EMPTY_FORM);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Name, email and phone are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim() || null,
          source: form.source,
          value: Number(form.value) || 0,
          currency: "PKR",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Lead created", {
        description: `${form.name.trim()} added as a new lead.`,
      });
      resetForm();
      setNewLeadOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create lead", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!filtered.length) {
      toast.info("Nothing to export", {
        description: "No leads match the current filters.",
      });
      return;
    }
    const rows: string[][] = [
      [
        "Name",
        "Email",
        "Phone",
        "Company",
        "Source",
        "Status",
        "Value",
        "Currency",
        "Score",
        "Assigned",
        "Created",
      ],
      ...filtered.map((l) => [
        l.name,
        l.email,
        l.phone,
        l.company ?? "",
        l.source,
        l.status,
        String(l.value),
        l.currency,
        String(l.score),
        l.rep?.name ?? "",
        l.createdAt,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playbeat-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export ready", {
      description: `${filtered.length} leads exported to CSV.`,
    });
  };

  return (
    <div>
      <SectionHeader
        title="Leads"
        description={`${filtered.length} leads · ${formatMoney(
          convert(totalPipelineUsd, "USD", displayCurrency),
          displayCurrency
        )} open pipeline`}
        action={
          <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Full name *</Label>
                  <Input
                    id="lead-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ahmed Raza"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="lead-email">Email *</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="ahmed@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lead-phone">Phone *</Label>
                    <Input
                      id="lead-phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="+92 300 1234567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="lead-company">Company</Label>
                    <Input
                      id="lead-company"
                      value={form.company}
                      onChange={(e) =>
                        setForm({ ...form, company: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lead-value">Deal value (PKR)</Label>
                    <Input
                      id="lead-value"
                      type="number"
                      value={form.value}
                      onChange={(e) =>
                        setForm({ ...form, value: e.target.value })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select
                    value={form.source}
                    onValueChange={(v) => setForm({ ...form, source: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewLeadOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="gap-1.5"
                  >
                    {submitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create Lead
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filter bar */}
      <Card className="card-shadow mb-4">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, phone…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reps</SelectItem>
                {reps?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[240px]">Lead</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-6 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No leads match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <MiniAvatar name={lead.name} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {lead.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {lead.company ?? lead.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(
                        convert(
                          lead.value,
                          lead.currency as Currency,
                          displayCurrency
                        ),
                        displayCurrency
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ScoreBadge score={lead.score} />
                    </TableCell>
                    <TableCell>
                      {lead.rep ? (
                        <div className="flex items-center gap-2">
                          <MiniAvatar name={lead.rep.name} size="sm" />
                          <span className="truncate text-xs">
                            {lead.rep.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
