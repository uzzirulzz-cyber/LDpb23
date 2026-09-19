"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  X,
  MoreHorizontal,
  Trash2,
  Settings2,
  Building2,
  RefreshCw,
  ExternalLink,
  Globe,
  Users as UsersIcon,
  MapPin,
  Briefcase,
  DollarSign,
  UserCog,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import {
  convert,
  formatMoney,
  type Currency,
  CURRENCIES,
} from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  EmptyState,
  LoadingGrid,
} from "../shared";
import { MiniAvatar, timeAgo, formatDate } from "../ui-helpers";
import { ManageFieldsDialog } from "./contacts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
interface Account {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  employees: number | null;
  locations: unknown[];
  revenue: number | null;
  revenueCurrency: string | null;
  ownerRepId: string | null;
  status: string;
  customFields: Record<string, unknown>;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}
interface AccountDetail extends Account {
  contacts: ContactSummary[];
}
interface ContactSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  phones: string[];
  lifecycleStage: string;
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
const ACCOUNT_STATUSES = ["active", "inactive", "churned", "prospect"];
const ACCOUNT_STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  },
  churned: {
    label: "Churned",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
  prospect: {
    label: "Prospect",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
};

const INDUSTRY_PALETTE: Record<string, string> = {
  SaaS: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Fintech: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Ecommerce: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Healthcare: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Education: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Media: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  Manufacturing: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

const EMPTY_FORM = {
  name: "",
  domain: "",
  website: "",
  industry: "",
  employees: "",
  country: "",
  revenue: "",
  revenueCurrency: "PKR",
  ownerRepId: "",
  status: "active",
};

type AccountForm = typeof EMPTY_FORM;

// ============================ Section ============================
export function AccountsSection() {
  const displayCurrency = useDashboard((s) => s.displayCurrency);
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const { data, loading, error } = useDashboardFetch<Account[]>(
    "/api/crm/accounts"
  );
  const { data: contactsAll } = useDashboardFetch<ContactSummary[]>(
    "/api/crm/contacts"
  );
  const { data: customFields } = useDashboardFetch<CustomField[]>(
    "/api/crm/custom-fields?entity=account"
  );

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("none");
  const [industryFilter, setIndustryFilter] = React.useState("none");

  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerData, setDrawerData] = React.useState<AccountDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Contact counts per account
  const contactCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contactsAll ?? []) {
      // ContactSummary doesn't include accountId, but /api/crm/contacts returns it
      const any = c as unknown as { accountId?: string };
      if (any.accountId) m.set(any.accountId, (m.get(any.accountId) ?? 0) + 1);
    }
    return m;
  }, [contactsAll]);

  // Industry options derived from data
  const industryOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of data ?? []) if (a.industry) set.add(a.industry);
    return Array.from(set).sort();
  }, [data]);

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = React.useMemo(() => {
    const list = data ?? [];
    return list.filter((a) => {
      if (statusFilter !== "none" && a.status !== statusFilter) return false;
      if (industryFilter !== "none" && a.industry !== industryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = [a.name, a.domain, a.website, a.industry, a.country]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, statusFilter, industryFilter]);

  const activeChips = React.useMemo(() => {
    const chips: { key: string; label: string; value: string; onClear: () => void }[] = [];
    if (search)
      chips.push({
        key: "search",
        label: "Search",
        value: search,
        onClear: () => {
          setSearchInput("");
          setSearch("");
        },
      });
    if (statusFilter !== "none")
      chips.push({
        key: "status",
        label: "Status",
        value: ACCOUNT_STATUS_META[statusFilter]?.label ?? statusFilter,
        onClear: () => setStatusFilter("none"),
      });
    if (industryFilter !== "none")
      chips.push({
        key: "industry",
        label: "Industry",
        value: industryFilter,
        onClear: () => setIndustryFilter("none"),
      });
    return chips;
  }, [search, statusFilter, industryFilter]);

  async function openDrawer(id: string) {
    setDrawerId(id);
    setDrawerData(null);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/crm/accounts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setDrawerData(json.data as AccountDetail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load account");
      setDrawerId(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function deleteAccount(id: string) {
    try {
      const res = await fetch(`/api/crm/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Account deleted");
      triggerRefresh();
      if (drawerId === id) setDrawerId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function createAccount(
    form: AccountForm,
    cfValues: Record<string, unknown>
  ) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        domain: form.domain || null,
        website: form.website || null,
        industry: form.industry || null,
        employees: form.employees ? Number(form.employees) : null,
        country: form.country || null,
        revenue: form.revenue ? Number(form.revenue) : null,
        revenueCurrency: form.revenue ? form.revenueCurrency : null,
        ownerRepId: form.ownerRepId || null,
        status: form.status,
        customFields: cfValues,
      };
      const res = await fetch("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Account created");
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
        title="Accounts"
        description="Companies you do business with — premium card grid with dynamic custom fields."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFieldsOpen(true)}
            >
              <Settings2 className="h-4 w-4" /> Manage Fields
            </Button>
            <Button onClick={() => setNewOpen(true)} size="sm">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState
          title="Couldn't load accounts"
          description={error}
          icon={RefreshCw}
        />
      ) : null}

      {/* ============ Filters ============ */}
      <Card className="glass card-shadow">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, domain, website, industry..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All statuses</SelectItem>
                {ACCOUNT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ACCOUNT_STATUS_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All industries</SelectItem>
                {industryOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeChips.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("none");
                  setIndustryFilter("none");
                }}
                className="text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear all
              </Button>
            ) : null}
          </div>

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
                    onClick={c.onClear}
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

      {/* ============ Card grid ============ */}
      {loading && !data ? (
        <LoadingGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            data && data.length > 0
              ? "No accounts match filters"
              : "No accounts yet"
          }
          description={
            data && data.length > 0
              ? "Try adjusting your filters."
              : "Add your first account to start organizing companies."
          }
          icon={Building2}
          action={
            data && data.length === 0 ? (
              <Button onClick={() => setNewOpen(true)} size="sm">
                <Plus className="h-4 w-4" /> Add Account
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("none");
                  setIndustryFilter("none");
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
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(320px, 1fr))`,
          }}
        >
          {filtered.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              displayCurrency={displayCurrency}
              contactCount={contactCounts.get(a.id) ?? 0}
              onOpen={() => openDrawer(a.id)}
              onDelete={() => deleteAccount(a.id)}
            />
          ))}
        </div>
      )}

      {/* ============ Drawer ============ */}
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span>{drawerData.name}</span>
                </>
              ) : (
                "Account detail"
              )}
            </SheetTitle>
            <SheetDescription>
              {drawerData
                ? drawerData.domain || drawerData.website || "Account record"
                : "Loading account..."}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : drawerData ? (
            <AccountDetailBody
              account={drawerData}
              customFields={customFields ?? []}
              onDelete={() => deleteAccount(drawerData.id)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ============ New Account Dialog ============ */}
      <NewAccountDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        customFields={customFields ?? []}
        saving={saving}
        onCreate={createAccount}
      />

      {/* ============ Manage Fields ============ */}
      <ManageFieldsDialog
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        entity="account"
      />
    </div>
  );
}

// ============================ Account card ============================
function AccountCard({
  account,
  displayCurrency,
  contactCount,
  onOpen,
  onDelete,
}: {
  account: Account;
  displayCurrency: Currency;
  contactCount: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const statusMeta =
    ACCOUNT_STATUS_META[account.status] ?? ACCOUNT_STATUS_META.inactive;
  const industryClass = account.industry
    ? INDUSTRY_PALETTE[account.industry] ??
      "bg-slate-500/10 text-slate-700 dark:text-slate-300"
    : null;

  const revenueCurrency =
    (account.revenueCurrency as Currency | null) ?? displayCurrency;
  const revenueDisplay =
    account.revenue != null && account.revenue > 0
      ? formatMoney(
          account.revenueCurrency
            ? account.revenue
            : Math.round(
                convert(account.revenue, "PKR", displayCurrency)
              ),
          revenueCurrency
        )
      : null;

  return (
    <Card
      className="glass gradient-card card-shadow cursor-pointer transition-all hover:ring-1 hover:ring-primary/30"
      onClick={onOpen}
    >
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{account.name}</p>
                {account.domain ? (
                  <a
                    href={`https://${account.domain}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    {account.domain}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Account actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpen}>
                  View detail
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status + Industry */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              statusMeta.className
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
            {statusMeta.label}
          </span>
          {industryClass && account.industry ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium",
                industryClass
              )}
            >
              {account.industry}
            </span>
          ) : null}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatChip
            icon={Briefcase}
            label="Employees"
            value={
              account.employees != null
                ? account.employees.toLocaleString()
                : "—"
            }
          />
          <StatChip
            icon={UsersIcon}
            label="Contacts"
            value={String(contactCount)}
          />
          <StatChip
            icon={MapPin}
            label="Country"
            value={account.country ?? "—"}
          />
          <StatChip
            icon={DollarSign}
            label="Revenue"
            value={revenueDisplay ?? "—"}
          />
        </div>

        {/* Owner */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
          <span className="inline-flex items-center gap-1">
            <UserCog className="h-3 w-3" /> Owner
          </span>
          <span className="font-mono truncate max-w-[150px]">
            {account.ownerRepId ?? "Unassigned"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

// ============================ Account detail body ============================
function AccountDetailBody({
  account,
  customFields,
  onDelete,
}: {
  account: AccountDetail;
  customFields: CustomField[];
  onDelete: () => void;
}) {
  const displayCurrency = useDashboard((s) => s.displayCurrency);
  const revenueCurrency =
    (account.revenueCurrency as Currency | null) ?? displayCurrency;
  const revenueDisplay =
    account.revenue != null && account.revenue > 0
      ? formatMoney(
          account.revenueCurrency
            ? account.revenue
            : Math.round(convert(account.revenue, "PKR", displayCurrency)),
          revenueCurrency
        )
      : null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AccountStatusBadge status={account.status} />
        {account.industry ? (
          <Badge variant="outline">{account.industry}</Badge>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <DetailBlock title="Company">
        <DetailRow label="Name" value={account.name} />
        <DetailRow
          label="Domain"
          value={
            account.domain ? (
              <a
                href={`https://${account.domain}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {account.domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null
          }
        />
        <DetailRow
          label="Website"
          value={
            account.website ? (
              <a
                href={
                  account.website.startsWith("http")
                    ? account.website
                    : `https://${account.website}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {account.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null
          }
        />
        <DetailRow label="Industry" value={account.industry} />
        <DetailRow label="Country" value={account.country} />
        <DetailRow
          label="Employees"
          value={
            account.employees != null
              ? account.employees.toLocaleString()
              : null
          }
        />
        <DetailRow label="Revenue" value={revenueDisplay} />
        <DetailRow
          label="Owner (Rep ID)"
          value={
            account.ownerRepId ? (
              <code className="font-mono text-xs">{account.ownerRepId}</code>
            ) : null
          }
        />
        <DetailRow label="Status" value={<span className="capitalize">{account.status}</span>} />
      </DetailBlock>

      {customFields.length > 0 ? (
        <DetailBlock title="Custom Fields">
          {customFields.map((cf) => (
            <DetailRow
              key={cf.id}
              label={cf.label}
              value={
                account.customFields[cf.name] !== undefined &&
                account.customFields[cf.name] !== null &&
                account.customFields[cf.name] !== ""
                  ? String(account.customFields[cf.name])
                  : "—"
              }
            />
          ))}
        </DetailBlock>
      ) : null}

      {/* Associated contacts */}
      <DetailBlock title={`Associated Contacts (${account.contacts.length})`}>
        {account.contacts.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No contacts linked to this account.
          </p>
        ) : (
          <div className="space-y-2">
            {account.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5"
              >
                <MiniAvatar
                  name={`${c.firstName} ${c.lastName}`}
                  size={24}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.jobTitle || c.email}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {c.lifecycleStage}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DetailBlock>

      <DetailBlock title="Activity Timeline">
        <p className="text-sm italic text-muted-foreground">
          No activity yet — interactions will appear here as the account is
          updated, contacted or quoted.
        </p>
      </DetailBlock>

      <p className="text-[11px] text-muted-foreground">
        Created {formatDate(account.createdAt)} · Updated {timeAgo(account.updatedAt)}
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

function AccountStatusBadge({ status }: { status: string }) {
  const meta = ACCOUNT_STATUS_META[status] ?? {
    label: status,
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

// ============================ New Account Dialog ============================
function NewAccountDialog({
  open,
  onOpenChange,
  customFields,
  saving,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customFields: CustomField[];
  saving: boolean;
  onCreate: (form: AccountForm, cf: Record<string, unknown>) => void;
}) {
  const [form, setForm] = React.useState<AccountForm>(EMPTY_FORM);
  const [cfValues, setCfValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setCfValues({});
    }
  }, [open]);

  function set<K extends keyof AccountForm>(k: K, v: AccountForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    onCreate(form, cfValues);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Create a new account (company). Optional fields can be left blank.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Acme Inc."
            />
          </Field>
          <Field label="Domain">
            <Input
              value={form.domain}
              onChange={(e) => set("domain", e.target.value)}
              placeholder="acme.com"
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://acme.com"
            />
          </Field>
          <Field label="Industry">
            <Input
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="SaaS"
            />
          </Field>
          <Field label="Employees">
            <Input
              type="number"
              value={form.employees}
              onChange={(e) => set("employees", e.target.value)}
              placeholder="50"
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Pakistan"
            />
          </Field>
          <Field label="Revenue">
            <Input
              type="number"
              value={form.revenue}
              onChange={(e) => set("revenue", e.target.value)}
              placeholder="1000000"
            />
          </Field>
          <Field label="Revenue Currency">
            <Select
              value={form.revenueCurrency}
              onValueChange={(v) => set("revenueCurrency", v)}
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
          <Field label="Owner (Rep ID)">
            <Input
              value={form.ownerRepId}
              onChange={(e) => set("ownerRepId", e.target.value)}
              placeholder="rep cuid..."
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ACCOUNT_STATUS_META[s]?.label ?? s}
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
            {saving ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Custom field input (local copy for account) ============================
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
                  onChange(on ? arr.filter((x) => x !== o) : [...arr, o])
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
