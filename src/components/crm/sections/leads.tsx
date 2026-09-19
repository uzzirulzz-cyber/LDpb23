"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  X,
  Eye,
  BadgeCheck,
  Sparkles,
  UserPlus,
  Workflow,
  MessageSquare,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Users as UsersIcon,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency, CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  EmptyState,
  LoadingGrid,
} from "../shared";
import {
  MiniAvatar,
  StatusBadge,
  VerificationBadge,
  timeAgo,
  formatDate,
  STATUS_META,
  VERIFICATION_META,
} from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// ============================ Types ============================
interface Rep {
  id: string;
  name: string;
  email: string;
}
interface LeadActivity {
  id: string;
  type: string;
  description: string;
  meta: Record<string, unknown>;
  createdAt: string;
}
interface Lead {
  id: string;
  name: string;
  company: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  jobTitle: string | null;
  source: string;
  sourceProvider: string | null;
  externalId: string | null;
  ingestionTimestamp: string | null;
  status: string;
  stage: string;
  verificationStatus: string;
  enrichedAt: string | null;
  consentState: string;
  value: number;
  currency: string;
  score: number;
  tags: string[];
  customFields: Record<string, unknown>;
  auditTrail: Array<Record<string, unknown>>;
  assignedTo: string | null;
  rep: Rep | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface LeadDetail extends Lead {
  activities: LeadActivity[];
  messages: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
  funnelRuns: Array<Record<string, unknown>>;
}
interface CustomField {
  id: string;
  entity: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

// ============================ Constants ============================
const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
  "archived",
];
const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "failed"];
const LEAD_SOURCES = [
  "manual",
  "website",
  "referral",
  "ads",
  "linkedin",
  "event",
  "outbound",
  "other",
];
const EMPTY_FORM: LeadFormState = {
  name: "",
  company: "",
  website: "",
  email: "",
  phone: "",
  whatsapp: "",
  country: "",
  city: "",
  industry: "",
  jobTitle: "",
  source: "manual",
  value: 0,
  currency: "PKR",
  score: 0,
  tags: "",
  assignedTo: "",
  status: "new",
  verificationStatus: "unverified",
  consentState: "unknown",
};

interface LeadFormState {
  name: string;
  company: string;
  website: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  industry: string;
  jobTitle: string;
  source: string;
  value: number;
  currency: string;
  score: number;
  tags: string;
  assignedTo: string;
  status: string;
  verificationStatus: string;
  consentState: string;
}

interface Filters {
  search: string;
  status: string;
  source: string;
  verificationStatus: string;
  assignedTo: string;
  archived: boolean;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  status: "none",
  source: "none",
  verificationStatus: "none",
  assignedTo: "none",
  archived: false,
};

// ============================ Section ============================
export function LeadsSection() {
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const { data, loading, error } = useDashboardFetch<Lead[]>(
    "/api/crm/leads?limit=200"
  );
  const { data: customFields } = useDashboardFetch<CustomField[]>(
    "/api/crm/custom-fields?entity=lead"
  );

  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = React.useState("");
  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerData, setDrawerData] = React.useState<LeadDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Derived reps from existing leads
  const reps = React.useMemo(() => {
    const map = new Map<string, Rep>();
    for (const l of data ?? []) {
      if (l.rep?.id) map.set(l.rep.id, l.rep);
    }
    return Array.from(map.values());
  }, [data]);

  // Derived unique sources (in case leads use custom sources)
  const sourceOptions = React.useMemo(() => {
    const set = new Set<string>(LEAD_SOURCES);
    for (const l of data ?? []) if (l.source) set.add(l.source);
    return Array.from(set);
  }, [data]);

  // Debounced search → filters.search
  React.useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput.trim() }));
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Client-side filtering on top of server fetch (server already filters too)
  const filtered = React.useMemo(() => {
    const list = data ?? [];
    return list.filter((l) => {
      // archived toggle: when archived=false, exclude archived; when true, only archived
      if (filters.archived) {
        if (!l.archivedAt) return false;
      } else {
        if (l.archivedAt) return false;
      }
      if (filters.status !== "none" && l.status !== filters.status) return false;
      if (filters.source !== "none" && l.source !== filters.source) return false;
      if (
        filters.verificationStatus !== "none" &&
        l.verificationStatus !== filters.verificationStatus
      )
        return false;
      if (filters.assignedTo !== "none") {
        if (filters.assignedTo === "unassigned") {
          if (l.assignedTo) return false;
        } else if (l.assignedTo !== filters.assignedTo) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const blob = [
          l.name,
          l.email,
          l.company,
          l.website,
          l.phone,
          l.whatsapp,
          l.city,
          l.country,
          l.industry,
          l.jobTitle,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [data, filters]);

  const activeChips = React.useMemo(() => {
    const chips: { key: keyof Filters; label: string; value: string }[] = [];
    if (filters.search)
      chips.push({ key: "search", label: "Search", value: filters.search });
    if (filters.status !== "none")
      chips.push({
        key: "status",
        label: "Status",
        value: STATUS_META[filters.status]?.label ?? filters.status,
      });
    if (filters.source !== "none")
      chips.push({ key: "source", label: "Source", value: filters.source });
    if (filters.verificationStatus !== "none")
      chips.push({
        key: "verificationStatus",
        label: "Verification",
        value:
          VERIFICATION_META[filters.verificationStatus]?.label ??
          filters.verificationStatus,
      });
    if (filters.assignedTo !== "none") {
      const r = reps.find((x) => x.id === filters.assignedTo);
      chips.push({
        key: "assignedTo",
        label: "Assigned",
        value:
          filters.assignedTo === "unassigned"
            ? "Unassigned"
            : r?.name ?? filters.assignedTo,
      });
    }
    return chips;
  }, [filters, reps]);

  function clearChip(key: keyof Filters) {
    setFilters((f) => ({
      ...f,
      [key]: key === "archived" ? false : key === "search" ? "" : "none",
    }));
    if (key === "search") setSearchInput("");
  }

  // ====== Mutations ======
  async function openDrawer(id: string) {
    setDrawerId(id);
    setDrawerData(null);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setDrawerData(json.data as LeadDetail);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to load lead detail"
      );
      setDrawerId(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function patchLead(
    id: string,
    body: Record<string, unknown>,
    successMsg: string
  ) {
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(successMsg);
      triggerRefresh();
      if (drawerId === id) void openDrawer(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function archiveLead(id: string, archive: boolean) {
    await patchLead(
      id,
      { archived: archive },
      archive ? "Lead archived" : "Lead restored"
    );
  }

  async function verifyLead(id: string) {
    await patchLead(id, { verificationStatus: "verified" }, "Lead verified");
  }

  async function addToFunnel(id: string) {
    try {
      const res = await fetch("/api/crm/funnel-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Lead added to funnel");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add to funnel");
    }
  }

  async function assignLead(id: string, repId: string) {
    await patchLead(
      id,
      { assignedTo: repId || null },
      repId ? "Lead assigned" : "Lead unassigned"
    );
    setAssignOpen(null);
  }

  async function createLead(form: LeadFormState, cfValues: Record<string, unknown>) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        company: form.company || null,
        website: form.website || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        country: form.country || null,
        city: form.city || null,
        industry: form.industry || null,
        jobTitle: form.jobTitle || null,
        source: form.source,
        value: Number(form.value) || 0,
        currency: form.currency,
        score: Number(form.score) || 0,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        assignedTo: form.assignedTo || null,
        status: form.status,
        verificationStatus: form.verificationStatus,
        consentState: form.consentState,
        customFields: cfValues,
      };
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Lead created");
      setNewOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Leads Explorer"
        description="Search, filter, enrich and route every inbound lead — premium control surface."
        action={
          <Button onClick={() => setNewOpen(true)} size="sm">
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        }
      />

      {error ? (
        <EmptyState
          title="Couldn't load leads"
          description={error}
          icon={RefreshCw}
        />
      ) : null}

      {/* ============ Filters bar ============ */}
      <Card className="glass card-shadow">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, company, website, phone..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source}
              onValueChange={(v) => setFilters((f) => ({ ...f, source: v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All sources</SelectItem>
                {sourceOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="capitalize">{s}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.verificationStatus}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, verificationStatus: v }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All verifications</SelectItem>
                {VERIFICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {VERIFICATION_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.assignedTo}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, assignedTo: v }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All assignments</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-1.5">
              <Switch
                checked={filters.archived}
                onCheckedChange={(v) =>
                  setFilters((f) => ({ ...f, archived: v }))
                }
                id="archived-toggle"
              />
              <Label htmlFor="archived-toggle" className="cursor-pointer text-xs">
                Archived
              </Label>
            </div>

            {activeChips.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSearchInput("");
                }}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear all
              </Button>
            ) : null}
          </div>

          {/* Filter chips */}
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {activeChips.map((c) => (
                <Badge
                  key={c.key}
                  variant="outline"
                  className="gap-1 py-0.5 pl-2 pr-1 text-xs font-medium"
                >
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span className="max-w-[180px] truncate">{c.value}</span>
                  <button
                    onClick={() => clearChip(c.key)}
                    className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`Remove ${c.label} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ============ Table ============ */}
      {loading && !data ? (
        <LoadingGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={data && data.length > 0 ? "No leads match filters" : "No leads yet"}
          description={
            data && data.length > 0
              ? "Try adjusting your filters to see results."
              : "Create your first lead to start filling the pipeline."
          }
          icon={UsersIcon}
          action={
            data && data.length === 0 ? (
              <Button onClick={() => setNewOpen(true)} size="sm">
                <Plus className="h-4 w-4" /> Create your first lead
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSearchInput("");
                }}
                size="sm"
                variant="outline"
              >
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <Card className="glass card-shadow">
          <CardContent className="px-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filtered.length}
                </span>{" "}
                of {data?.length ?? 0} leads
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => openDrawer(l.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={l.name} size={28} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {l.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {l.jobTitle || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{l.company || "—"}</p>
                        {l.website ? (
                          <a
                            href={
                              l.website.startsWith("http")
                                ? l.website
                                : `https://${l.website}`
                            }
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {l.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.phone || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.whatsapp || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {[l.city, l.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.industry || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {l.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>
                      <VerificationBadge status={l.verificationStatus} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.rep?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {l.score}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(l.createdAt)}
                    </TableCell>
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="text-right"
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Lead actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openDrawer(l.id)}
                          >
                            <Eye className="h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => verifyLead(l.id)}
                            disabled={l.verificationStatus === "verified"}
                          >
                            <BadgeCheck className="h-4 w-4" /> Verify
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toast.info("Enrichment queued", {
                                description:
                                  "Enrichment will run when a provider is connected.",
                              })
                            }
                          >
                            <Sparkles className="h-4 w-4" /> Enrich
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setAssignOpen(l.id)}
                          >
                            <UserPlus className="h-4 w-4" /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => addToFunnel(l.id)}
                          >
                            <Workflow className="h-4 w-4" /> Add to Funnel
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toast.info("Compose dialog", {
                                description:
                                  "Multi-channel compose is in the Inbox section.",
                              })
                            }
                          >
                            <MessageSquare className="h-4 w-4" /> Contact
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {l.archivedAt ? (
                            <DropdownMenuItem
                              onClick={() => archiveLead(l.id, false)}
                            >
                              <ArchiveRestore className="h-4 w-4" /> Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => archiveLead(l.id, true)}
                            >
                              <Archive className="h-4 w-4" /> Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============ View Drawer ============ */}
      <Sheet
        open={drawerId !== null}
        onOpenChange={(o) => !o && setDrawerId(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {drawerData ? (
                <>
                  <MiniAvatar name={drawerData.name} size={32} />
                  <span>{drawerData.name}</span>
                </>
              ) : (
                "Lead detail"
              )}
            </SheetTitle>
            <SheetDescription>
              {drawerData
                ? drawerData.jobTitle || drawerData.company || "Lead record"
                : "Loading lead detail..."}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : drawerData ? (
            <LeadDetailBody
              lead={drawerData}
              customFields={customFields ?? []}
              onVerify={() => verifyLead(drawerData.id)}
              onArchive={() => archiveLead(drawerData.id, !drawerData.archivedAt)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ============ New Lead Dialog ============ */}
      <NewLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        customFields={customFields ?? []}
        reps={reps}
        sourceOptions={sourceOptions}
        saving={saving}
        onCreate={createLead}
      />

      {/* ============ Assign Dialog ============ */}
      <AssignDialog
        leadId={assignOpen}
        reps={reps}
        onClose={() => setAssignOpen(null)}
        onAssign={assignLead}
      />
    </div>
  );
}

// ============================ Lead detail body ============================
function LeadDetailBody({
  lead,
  customFields,
  onVerify,
  onArchive,
}: {
  lead: LeadDetail;
  customFields: CustomField[];
  onVerify: () => void;
  onArchive: () => void;
}) {
  const displayCurrency = useDashboard((s) => s.displayCurrency);
  const valueInDisplay =
    lead.currency === displayCurrency
      ? lead.value
      : Math.round(convert(lead.value, lead.currency as Currency, displayCurrency));

  return (
    <div className="space-y-4 p-4">
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={lead.status} />
        <VerificationBadge status={lead.verificationStatus} />
        <Badge variant="outline" className="capitalize">
          {lead.source}
        </Badge>
        {lead.archivedAt ? (
          <Badge variant="secondary" className="text-slate-500">
            Archived
          </Badge>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onVerify}>
          <BadgeCheck className="h-4 w-4" /> Verify
        </Button>
        <Button size="sm" variant="outline" onClick={onArchive}>
          {lead.archivedAt ? (
            <>
              <ArchiveRestore className="h-4 w-4" /> Unarchive
            </>
          ) : (
            <>
              <Archive className="h-4 w-4" /> Archive
            </>
          )}
        </Button>
      </div>

      {/* Contact info */}
      <DetailBlock title="Contact">
        <DetailRow label="Email" value={lead.email} />
        <DetailRow label="Phone" value={lead.phone} />
        <DetailRow label="WhatsApp" value={lead.whatsapp} />
        <DetailRow
          label="Location"
          value={[lead.city, lead.country].filter(Boolean).join(", ")}
        />
      </DetailBlock>

      {/* Company info */}
      <DetailBlock title="Company">
        <DetailRow label="Company" value={lead.company} />
        <DetailRow
          label="Website"
          value={
            lead.website ? (
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {lead.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null
          }
        />
        <DetailRow label="Industry" value={lead.industry} />
        <DetailRow label="Job Title" value={lead.jobTitle} />
      </DetailBlock>

      {/* Deal info */}
      <DetailBlock title="Deal">
        <DetailRow
          label="Value"
          value={formatMoney(valueInDisplay, displayCurrency)}
        />
        <DetailRow
          label="Original"
          value={`${formatMoney(lead.value, lead.currency as Currency)} ${
            lead.currency
          }`}
        />
        <DetailRow label="Score" value={`${lead.score}`} />
        <DetailRow label="Stage" value={<span className="capitalize">{lead.stage}</span>} />
        <DetailRow label="Assigned to" value={lead.rep?.name ?? "—"} />
        <DetailRow label="Consent" value={<span className="capitalize">{lead.consentState}</span>} />
      </DetailBlock>

      {/* Tags */}
      {lead.tags.length > 0 ? (
        <DetailBlock title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </DetailBlock>
      ) : null}

      {/* Custom fields */}
      {customFields.length > 0 ? (
        <DetailBlock title="Custom Fields">
          {customFields.map((cf) => (
            <DetailRow
              key={cf.id}
              label={cf.label}
              value={
                lead.customFields[cf.name] !== undefined &&
                lead.customFields[cf.name] !== null &&
                lead.customFields[cf.name] !== ""
                  ? String(lead.customFields[cf.name])
                  : "—"
              }
            />
          ))}
        </DetailBlock>
      ) : null}

      {/* Activity timeline */}
      <DetailBlock title="Activity Timeline">
        {lead.activities.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No activity yet — interactions will appear here.
          </p>
        ) : (
          <ol className="relative space-y-2 border-l border-border/60 pl-3">
            {lead.activities.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[14px] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <p className="text-sm">{a.description}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {a.type.replace(/_/g, " ")} · {timeAgo(a.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </DetailBlock>

      {/* Audit trail */}
      {lead.auditTrail.length > 0 ? (
        <DetailBlock title="Audit Trail">
          <ol className="space-y-1.5">
            {lead.auditTrail.slice(0, 10).map((e, i) => (
              <li
                key={i}
                className="rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5 text-xs"
              >
                <span className="font-medium capitalize">
                  {String(e.action ?? "event").replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">
                  {" · "}
                  {e.at ? timeAgo(String(e.at)) : ""}
                  {e.actor ? ` · ${e.actor}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </DetailBlock>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Created {formatDate(lead.createdAt)} · Updated {timeAgo(lead.updatedAt)}
      </p>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === "" ||
    value === "—";
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-medium tabular-nums break-all",
          isEmpty && "italic text-muted-foreground/60 font-normal"
        )}
      >
        {isEmpty ? "—" : value}
      </span>
    </div>
  );
}

// ============================ New Lead Dialog ============================
function NewLeadDialog({
  open,
  onOpenChange,
  customFields,
  reps,
  sourceOptions,
  saving,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customFields: CustomField[];
  reps: Rep[];
  sourceOptions: string[];
  saving: boolean;
  onCreate: (form: LeadFormState, cf: Record<string, unknown>) => void;
}) {
  const [form, setForm] = React.useState<LeadFormState>(EMPTY_FORM);
  const [cfValues, setCfValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setCfValues({});
    }
  }, [open]);

  function set<K extends keyof LeadFormState>(k: K, v: LeadFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    onCreate(form, cfValues);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>
            Create a new lead. All fields optional except name.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Job Title">
            <Input
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
              placeholder="VP Marketing"
            />
          </Field>
          <Field label="Company">
            <Input
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Acme Inc."
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="acme.com"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@acme.com"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+92..."
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="+92..."
            />
          </Field>
          <Field label="Industry">
            <Input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="SaaS"
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Pakistan"
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Karachi"
            />
          </Field>
          <Field label="Source">
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="capitalize">{s}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.filter((s) => s !== "archived").map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Verification">
            <Select
              value={form.verificationStatus}
              onValueChange={(v) => set("verificationStatus", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERIFICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {VERIFICATION_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Consent">
            <Select
              value={form.consentState}
              onValueChange={(v) => set("consentState", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="opted_in">Opted In</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Value">
            <Input
              type="number"
              value={form.value}
              onChange={(e) => set("value", Number(e.target.value))}
              placeholder="0"
            />
          </Field>
          <Field label="Currency">
            <Select
              value={form.currency}
              onValueChange={(v) => set("currency", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Score">
            <Input
              type="number"
              value={form.score}
              onChange={(e) => set("score", Number(e.target.value))}
              placeholder="0"
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="priority, enterprise"
            />
          </Field>
          <Field label="Assigned To (Rep ID)">
            <Select
              value={form.assignedTo || "none"}
              onValueChange={(v) => set("assignedTo", v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Custom fields */}
        {customFields.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Custom Fields
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customFields.map((cf) => (
                <CustomFieldInput
                  key={cf.id}
                  field={cf}
                  value={cfValues[cf.name]}
                  onChange={(v) =>
                    setCfValues((s) => ({ ...s, [cf.name]: v }))
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Custom field input ============================
function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = field.label || field.name;
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={`cf-${field.id}`}
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(Boolean(v))}
        />
        <Label htmlFor={`cf-${field.id}`} className="cursor-pointer text-sm">
          {label}
        </Label>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <Field label={label}>
        <Select
          value={(value as string) || "none"}
          onValueChange={(v) => onChange(v === "none" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }
  if (field.type === "multiselect") {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Field label={label}>
        <div className="flex flex-wrap gap-1.5 rounded-md border border-input p-1.5 min-h-9">
          {field.options.map((o) => {
            const on = arr.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() =>
                  onChange(
                    on ? arr.filter((x) => x !== o) : [...arr, o]
                  )
                }
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {o}
              </button>
            );
          })}
          {field.options.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No options configured
            </span>
          ) : null}
        </div>
      </Field>
    );
  }
  if (field.type === "date") {
    return (
      <Field label={label}>
        <Input
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }
  if (field.type === "number") {
    return (
      <Field label={label}>
        <Input
          type="number"
          value={(value as number | string) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </Field>
    );
  }
  return (
    <Field label={label}>
      <Input
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ============================ Assign Dialog ============================
function AssignDialog({
  leadId,
  reps,
  onClose,
  onAssign,
}: {
  leadId: string | null;
  reps: Rep[];
  onClose: () => void;
  onAssign: (id: string, repId: string) => void;
}) {
  const [repId, setRepId] = React.useState("none");
  const [custom, setCustom] = React.useState("");

  React.useEffect(() => {
    if (leadId !== null) {
      setRepId("none");
      setCustom("");
    }
  }, [leadId]);

  return (
    <Dialog open={leadId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>
            Choose an existing rep or enter a rep ID manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="Rep">
            <Select value={repId} onValueChange={setRepId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} <span className="text-xs text-muted-foreground">· {r.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {repId === "none" ? (
            <Field label="Or enter Rep ID manually">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="rep cuid..."
              />
            </Field>
          ) : null}

          {reps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No reps found in existing leads. Assign one by entering their rep
              ID above — reps can be created via the database or a future reps
              endpoint.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const id = repId !== "none" ? repId : custom.trim();
              if (leadId) onAssign(leadId, id);
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
