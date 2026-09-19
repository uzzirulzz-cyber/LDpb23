"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  X,
  MoreHorizontal,
  Eye,
  Trash2,
  Settings2,
  Users as UsersIcon,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  EmptyState,
  LoadingGrid,
} from "../shared";
import {
  MiniAvatar,
  timeAgo,
  formatDate,
} from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
interface Contact {
  id: string;
  accountId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phones: string[];
  emails: string[];
  whatsapp: string | null;
  jobTitle: string | null;
  country: string | null;
  city: string | null;
  lifecycleStage: string;
  consentState: string;
  commPreferences: Record<string, boolean>;
  source: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}
interface ContactDetail extends Contact {
  account: {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
  } | null;
}
interface Account {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  country: string | null;
  employees: number | null;
  revenue: number | null;
  revenueCurrency: string | null;
  status: string;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
const LIFECYCLE_STAGES = ["lead", "mql", "sql", "opportunity", "customer"];
const CONSENT_STATES = ["unknown", "opted_in", "opted_out"];

const LIFECYCLE_META: Record<string, { label: string; className: string }> = {
  lead: {
    label: "Lead",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  mql: {
    label: "MQL",
    className:
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  },
  sql: {
    label: "SQL",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  },
  opportunity: {
    label: "Opportunity",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  customer: {
    label: "Customer",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
};

const CONSENT_META: Record<string, { label: string; className: string }> = {
  unknown: {
    label: "Unknown",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  opted_in: {
    label: "Opted In",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  opted_out: {
    label: "Opted Out",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
};

const COMM_CHANNELS = ["email", "sms", "whatsapp", "phone", "marketing"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  whatsapp: "",
  jobTitle: "",
  country: "",
  city: "",
  lifecycleStage: "lead",
  consentState: "unknown",
  source: "",
  tags: "",
  accountId: "",
  assignedTo: "",
  phones: [""],
  emails: [""],
  commPreferences: {
    email: true,
    sms: false,
    whatsapp: false,
    phone: false,
    marketing: false,
  } as Record<string, boolean>,
};

type ContactForm = typeof EMPTY_FORM;

// ============================ Section ============================
export function ContactsSection() {
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const { data, loading, error } = useDashboardFetch<Contact[]>(
    "/api/crm/contacts"
  );
  const { data: accounts } = useDashboardFetch<Account[]>("/api/crm/accounts");
  const { data: customFields } = useDashboardFetch<CustomField[]>(
    "/api/crm/custom-fields?entity=contact"
  );

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [lifecycleFilter, setLifecycleFilter] = React.useState("none");
  const [consentFilter, setConsentFilter] = React.useState("none");
  const [accountFilter, setAccountFilter] = React.useState("none");

  const [drawerId, setDrawerId] = React.useState<string | null>(null);
  const [drawerData, setDrawerData] = React.useState<ContactDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Build account lookup
  const accountMap = React.useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accounts ?? []) m.set(a.id, a);
    return m;
  }, [accounts]);

  // Debounced search
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = React.useMemo(() => {
    const list = data ?? [];
    return list.filter((c) => {
      if (lifecycleFilter !== "none" && c.lifecycleStage !== lifecycleFilter)
        return false;
      if (consentFilter !== "none" && c.consentState !== consentFilter)
        return false;
      if (accountFilter !== "none") {
        if (accountFilter === "unassigned") {
          if (c.accountId) return false;
        } else if (c.accountId !== accountFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const blob = [
          c.firstName,
          c.lastName,
          c.email,
          c.jobTitle,
          c.country,
          c.city,
          c.whatsapp,
          ...(c.phones ?? []),
          ...(c.emails ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, lifecycleFilter, consentFilter, accountFilter]);

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
    if (lifecycleFilter !== "none")
      chips.push({
        key: "lifecycle",
        label: "Lifecycle",
        value: LIFECYCLE_META[lifecycleFilter]?.label ?? lifecycleFilter,
        onClear: () => setLifecycleFilter("none"),
      });
    if (consentFilter !== "none")
      chips.push({
        key: "consent",
        label: "Consent",
        value: CONSENT_META[consentFilter]?.label ?? consentFilter,
        onClear: () => setConsentFilter("none"),
      });
    if (accountFilter !== "none") {
      const acc = accountMap.get(accountFilter);
      chips.push({
        key: "account",
        label: "Account",
        value:
          accountFilter === "unassigned"
            ? "Unassigned"
            : acc?.name ?? accountFilter,
        onClear: () => setAccountFilter("none"),
      });
    }
    return chips;
  }, [search, lifecycleFilter, consentFilter, accountFilter, accountMap]);

  async function openDrawer(id: string) {
    setDrawerId(id);
    setDrawerData(null);
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setDrawerData(json.data as ContactDetail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contact");
      setDrawerId(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  async function deleteContact(id: string) {
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Contact deleted");
      triggerRefresh();
      if (drawerId === id) setDrawerId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function createContact(
    form: ContactForm,
    cfValues: Record<string, unknown>
  ) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phones: form.phones.map((p) => p.trim()).filter(Boolean),
        emails: form.emails.map((p) => p.trim()).filter(Boolean),
        whatsapp: form.whatsapp || null,
        jobTitle: form.jobTitle || null,
        country: form.country || null,
        city: form.city || null,
        lifecycleStage: form.lifecycleStage,
        consentState: form.consentState,
        commPreferences: form.commPreferences,
        source: form.source || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        customFields: cfValues,
        accountId: form.accountId || null,
        assignedTo: form.assignedTo || null,
      };
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Contact created");
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
        title="Contacts"
        description="Customizable contacts — multiple phones, consent, comm preferences and dynamic fields."
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
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </div>
        }
      />

      {error ? (
        <EmptyState
          title="Couldn't load contacts"
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
                placeholder="Search name, email, phone, title..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Lifecycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All lifecycles</SelectItem>
                {LIFECYCLE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LIFECYCLE_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={consentFilter} onValueChange={setConsentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Consent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All consent</SelectItem>
                {CONSENT_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CONSENT_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All accounts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
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
                  setLifecycleFilter("none");
                  setConsentFilter("none");
                  setAccountFilter("none");
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

      {/* ============ Table ============ */}
      {loading && !data ? (
        <LoadingGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            data && data.length > 0
              ? "No contacts match filters"
              : "No contacts yet"
          }
          description={
            data && data.length > 0
              ? "Try adjusting your filters."
              : "Add your first contact to start building your network."
          }
          icon={UsersIcon}
          action={
            data && data.length === 0 ? (
              <Button onClick={() => setNewOpen(true)} size="sm">
                <Plus className="h-4 w-4" /> Add Contact
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setLifecycleFilter("none");
                  setConsentFilter("none");
                  setAccountFilter("none");
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
                of {data?.length ?? 0} contacts
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Lifecycle</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const acc = c.accountId
                    ? accountMap.get(c.accountId)
                    : null;
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => openDrawer(c.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MiniAvatar
                            name={`${c.firstName} ${c.lastName}`}
                            size={28}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.assignedTo ? `Assigned` : "Unassigned"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.phones?.[0] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.whatsapp || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.jobTitle || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {acc ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {acc.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <LifecycleBadge stage={c.lifecycleStage} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.country || "—"}
                      </TableCell>
                      <TableCell>
                        <ConsentBadge state={c.consentState} />
                      </TableCell>
                      <TableCell>
                        {c.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.tags.slice(0, 2).map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="text-xs"
                              >
                                {t}
                              </Badge>
                            ))}
                            {c.tags.length > 2 ? (
                              <Badge variant="outline" className="text-xs">
                                +{c.tags.length - 2}
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                              aria-label="Contact actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openDrawer(c.id)}
                            >
                              <Eye className="h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteContact(c.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                  <MiniAvatar
                    name={`${drawerData.firstName} ${drawerData.lastName}`}
                    size={32}
                  />
                  <span>
                    {drawerData.firstName} {drawerData.lastName}
                  </span>
                </>
              ) : (
                "Contact detail"
              )}
            </SheetTitle>
            <SheetDescription>
              {drawerData
                ? drawerData.jobTitle || "Contact record"
                : "Loading contact..."}
            </SheetDescription>
          </SheetHeader>

          {drawerLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : drawerData ? (
            <ContactDetailBody
              contact={drawerData}
              customFields={customFields ?? []}
              account={
                drawerData.account
                  ? {
                      id: drawerData.account.id,
                      name: drawerData.account.name,
                      domain: drawerData.account.domain,
                      website: drawerData.account.website,
                    }
                  : null
              }
              onDelete={() => {
                if (drawerData) deleteContact(drawerData.id);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ============ New Contact Dialog ============ */}
      <NewContactDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        customFields={customFields ?? []}
        accounts={accounts ?? []}
        saving={saving}
        onCreate={createContact}
      />

      {/* ============ Manage Fields Dialog ============ */}
      <ManageFieldsDialog
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
        entity="contact"
      />
    </div>
  );
}

// ============================ Badges ============================
function LifecycleBadge({ stage }: { stage: string }) {
  const meta = LIFECYCLE_META[stage] ?? {
    label: stage,
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

function ConsentBadge({ state }: { state: string }) {
  const meta = CONSENT_META[state] ?? {
    label: state,
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

// ============================ Detail body ============================
function ContactDetailBody({
  contact,
  customFields,
  account,
  onDelete,
}: {
  contact: ContactDetail;
  customFields: CustomField[];
  account: {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
  } | null;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <LifecycleBadge stage={contact.lifecycleStage} />
        <ConsentBadge state={contact.consentState} />
        {contact.source ? (
          <Badge variant="outline" className="capitalize">
            {contact.source}
          </Badge>
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

      <DetailBlock title="Identity">
        <DetailRow label="First name" value={contact.firstName} />
        <DetailRow label="Last name" value={contact.lastName} />
        <DetailRow label="Job title" value={contact.jobTitle} />
        <DetailRow label="Source" value={contact.source} />
      </DetailBlock>

      <DetailBlock title="Emails">
        {contact.emails.length === 0 && !contact.email ? (
          <p className="text-sm italic text-muted-foreground">No email</p>
        ) : null}
        {contact.email ? (
          <p className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {contact.email}{" "}
            <Badge variant="outline" className="text-[10px]">
              primary
            </Badge>
          </p>
        ) : null}
        {contact.emails
          .filter((e) => e && e !== contact.email)
          .map((e, i) => (
            <p
              key={i}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Mail className="h-3.5 w-3.5" />
              {e}
            </p>
          ))}
      </DetailBlock>

      <DetailBlock title="Phones">
        {contact.phones.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No phones</p>
        ) : (
          contact.phones.map((p, i) => (
            <p key={i} className="flex items-center gap-1.5 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {p}
            </p>
          ))
        )}
        {contact.whatsapp ? (
          <p className="flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-emerald-500" />
            WhatsApp: {contact.whatsapp}
          </p>
        ) : null}
      </DetailBlock>

      <DetailBlock title="Location">
        <DetailRow label="City" value={contact.city} />
        <DetailRow label="Country" value={contact.country} />
      </DetailBlock>

      <DetailBlock title="Associated Account">
        {account ? (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {account.name}
            </p>
            {account.domain ? (
              <p className="text-xs text-muted-foreground">{account.domain}</p>
            ) : null}
            {account.website ? (
              <a
                href={
                  account.website.startsWith("http")
                    ? account.website
                    : `https://${account.website}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {account.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            Not linked to an account.
          </p>
        )}
      </DetailBlock>

      <DetailBlock title="Communication Preferences">
        <div className="flex flex-wrap gap-1.5">
          {COMM_CHANNELS.map((ch) => {
            const on = contact.commPreferences?.[ch] === true;
            return (
              <Badge
                key={ch}
                variant={on ? "default" : "outline"}
                className={cn(
                  "text-xs capitalize",
                  !on && "text-muted-foreground"
                )}
              >
                {ch}
              </Badge>
            );
          })}
        </div>
      </DetailBlock>

      {contact.tags.length > 0 ? (
        <DetailBlock title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </DetailBlock>
      ) : null}

      {customFields.length > 0 ? (
        <DetailBlock title="Custom Fields">
          {customFields.map((cf) => (
            <DetailRow
              key={cf.id}
              label={cf.label}
              value={
                contact.customFields[cf.name] !== undefined &&
                contact.customFields[cf.name] !== null &&
                contact.customFields[cf.name] !== ""
                  ? String(contact.customFields[cf.name])
                  : "—"
              }
            />
          ))}
        </DetailBlock>
      ) : null}

      <DetailBlock title="Activity Timeline">
        <p className="text-sm italic text-muted-foreground">
          No activity yet — interaction history will appear here as messages,
          notes and lifecycle changes are logged.
        </p>
      </DetailBlock>

      <p className="text-[11px] text-muted-foreground">
        Created {formatDate(contact.createdAt)} · Updated {timeAgo(contact.updatedAt)}
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

// ============================ New Contact Dialog ============================
function NewContactDialog({
  open,
  onOpenChange,
  customFields,
  accounts,
  saving,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customFields: CustomField[];
  accounts: Account[];
  saving: boolean;
  onCreate: (form: ContactForm, cf: Record<string, unknown>) => void;
}) {
  const [form, setForm] = React.useState<ContactForm>(EMPTY_FORM);
  const [cfValues, setCfValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setCfValues({});
    }
  }, [open]);

  function set<K extends keyof ContactForm>(k: K, v: ContactForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error("First name and email are required");
      return;
    }
    onCreate(form, cfValues);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Standard fields plus any custom fields configured for contacts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First Name *">
            <Input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </Field>
          <Field label="Last Name">
            <Input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </Field>
          <Field label="Email *">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="primary email"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Job Title">
            <Input
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Source">
            <Input
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              placeholder="referral, ads..."
            />
          </Field>
          <Field label="Lifecycle Stage">
            <Select
              value={form.lifecycleStage}
              onValueChange={(v) => set("lifecycleStage", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LIFECYCLE_META[s]?.label ?? s}
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
                {CONSENT_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CONSENT_META[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Account">
            <Select
              value={form.accountId || "none"}
              onValueChange={(v) => set("accountId", v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tags (comma-separated)">
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="vip, partner"
            />
          </Field>
        </div>

        {/* Phones array */}
        <ArrayField
          label="Phone Numbers"
          values={form.phones}
          placeholder="+92..."
          onChange={(arr) => set("phones", arr)}
        />

        {/* Emails array */}
        <ArrayField
          label="Additional Emails"
          values={form.emails}
          placeholder="alt@example.com"
          onChange={(arr) => set("emails", arr)}
        />

        {/* Comm preferences */}
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Communication Preferences
          </p>
          <div className="flex flex-wrap gap-3">
            {COMM_CHANNELS.map((ch) => (
              <label
                key={ch}
                className="flex items-center gap-1.5 text-sm capitalize cursor-pointer"
              >
                <Checkbox
                  checked={Boolean(form.commPreferences[ch])}
                  onCheckedChange={(v) =>
                    set("commPreferences", {
                      ...form.commPreferences,
                      [ch]: Boolean(v),
                    })
                  }
                />
                {ch}
              </label>
            ))}
          </div>
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
            {saving ? "Creating..." : "Create Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArrayField({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder?: string;
  onChange: (arr: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              value={v}
              placeholder={placeholder}
              onChange={(e) => {
                const arr = [...values];
                arr[i] = e.target.value;
                onChange(arr);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              disabled={values.length === 1 && !v}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...values, ""])}
        >
          <Plus className="h-3.5 w-3.5" /> Add another
        </Button>
      </div>
    </div>
  );
}

// ============================ Custom field input (shared) ============================
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

// ============================ Manage Fields Dialog ============================
const FIELD_TYPES = ["text", "number", "select", "multiselect", "date", "boolean"];

function ManageFieldsDialog({
  open,
  onOpenChange,
  entity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: "contact" | "account" | "lead";
}) {
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const { data, loading } = useDashboardFetch<CustomField[]>(
    `/api/crm/custom-fields?entity=${entity}`
  );

  const [name, setName] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState("text");
  const [options, setOptions] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function createField() {
    if (!name.trim() || !label.trim()) {
      toast.error("Field name and label are required");
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name.trim())) {
      toast.error("Name must start with a letter and use only letters, numbers, underscores");
      return;
    }
    setCreating(true);
    try {
      const opts = options
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const res = await fetch("/api/crm/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          name: name.trim(),
          label: label.trim(),
          type,
          options: type === "select" || type === "multiselect" ? opts : [],
          required: false,
          sortOrder: 0,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Field created");
      setName("");
      setLabel("");
      setOptions("");
      setType("text");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function deleteField(id: string) {
    try {
      const res = await fetch(`/api/crm/custom-fields/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Field deleted");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Manage {entity[0].toUpperCase() + entity.slice(1)} Fields
          </DialogTitle>
          <DialogDescription>
            Create new custom fields without changing code. Fields appear in
            create dialogs and detail drawers automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Create new field */}
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            New Field
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name (key) *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="annual_revenue"
              />
            </Field>
            <Field label="Label *">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Annual Revenue"
              />
            </Field>
            <Field label="Type">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {type === "select" || type === "multiselect" ? (
              <Field label="Options (comma-separated)">
                <Input
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="low, medium, high"
                />
              </Field>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button onClick={createField} disabled={creating} size="sm">
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Creating..." : "Add Field"}
            </Button>
          </div>
        </div>

        {/* Existing fields */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Existing Fields
          </p>
          {loading && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              title="No custom fields yet"
              description="Create your first field above to extend this entity."
              icon={Settings2}
            />
          ) : (
            <div className="space-y-1.5">
              {data.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <code className="font-mono">{f.name}</code> · {f.type}
                      {f.options.length > 0
                        ? ` · ${f.options.length} options`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteField(f.id)}
                    aria-label={`Delete field ${f.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ManageFieldsDialog };
