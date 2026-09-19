"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  User,
  Shield,
  ListPlus,
  Filter,
  BarChart3,
  Plus,
  Trash2,
  Loader2,
  Flame,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";

import { SectionHeader, EmptyState } from "../shared";
import { timeAgo } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ============================ Types ============================
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

interface FunnelStage {
  id: string;
  name: string;
  code: string;
  order: number;
  type: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

// ============================ Constants ============================
const META_PIXEL_ID = "1052867624415243";

const FIELD_TYPES = ["text", "number", "select", "multiselect", "date", "boolean"];
const FIELD_ENTITIES = ["lead", "contact", "account"];

// ============================ Section ============================
export function SettingsSection() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Settings"
        description="Manage your profile, security, custom fields, funnel stages, and Meta Pixel configuration."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="gap-1.5">
            <ListPlus className="h-3.5 w-3.5" /> Custom Fields
          </TabsTrigger>
          <TabsTrigger value="funnel-stages" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Funnel Stages
          </TabsTrigger>
          <TabsTrigger value="meta-pixel" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Meta Pixel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="custom-fields" className="space-y-4">
          <CustomFieldsTab />
        </TabsContent>
        <TabsContent value="funnel-stages" className="space-y-4">
          <FunnelStagesTab />
        </TabsContent>
        <TabsContent value="meta-pixel" className="space-y-4">
          <MetaPixelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================ Profile Tab ============================
function ProfileTab() {
  return (
    <Card className="glass premium-shadow">
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>
          Your user account information. Updates require a backend user API
          endpoint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" placeholder="Admin User" disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-email">Email</Label>
            <Input
              id="p-email"
              type="email"
              placeholder="admin@playbeat.digital"
              disabled
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-role">Role</Label>
            <Input id="p-role" defaultValue="admin" disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-provider">Auth provider</Label>
            <Input id="p-provider" placeholder="credentials / google / facebook" disabled />
          </div>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Profile updates require a backend user API endpoint to be implemented.
          Contact an administrator to change your name, email, or role.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================ Security Tab ============================
function SecurityTab() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!current || !next || !confirm) {
      toast.error("All fields are required");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    // No backend endpoint exists yet — be honest.
    setTimeout(() => {
      setSaving(false);
      toast.error("Password change requires a backend auth endpoint", {
        description:
          "Implement /api/auth/change-password to enable this form.",
      });
    }, 600);
  };

  return (
    <>
      <Card className="glass premium-shadow">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>
            Requires a backend password-change endpoint. This form will not
            submit until that endpoint exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur">Current password</Label>
              <Input
                id="cur"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf">Confirm new</Label>
              <Input
                id="conf"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card className="glass premium-shadow">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>
            Active session information. Requires a session-info API endpoint to
            populate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Strategy
              </p>
              <p className="mt-0.5">NextAuth JWT</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Token expiry
              </p>
              <p className="mt-0.5">30 days (default)</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Last login
              </p>
              <p className="mt-0.5 text-muted-foreground italic">
                Requires session endpoint
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Sessions
              </p>
              <p className="mt-0.5 text-muted-foreground italic">
                JWT strategy — no server-side session table
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================ Custom Fields Tab ============================
function CustomFieldsTab() {
  const { data: fields, loading, error } = useDashboardFetch<CustomField[]>(
    "/api/crm/custom-fields"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [addOpen, setAddOpen] = React.useState(false);

  const grouped = React.useMemo(() => {
    const map: Record<string, CustomField[]> = {};
    for (const f of fields ?? []) {
      if (!map[f.entity]) map[f.entity] = [];
      map[f.entity].push(f);
    }
    return map;
  }, [fields]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete custom field "${label}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/crm/custom-fields/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Field deleted");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <Card className="glass premium-shadow">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Custom Fields</CardTitle>
          <CardDescription>
            Create new fields for leads, contacts, or accounts without changing
            code. Field values are stored as JSON on each record.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Field
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !fields || fields.length === 0 ? (
          <EmptyState
            icon={ListPlus}
            title="No custom fields yet"
            description="Create custom fields to extend lead, contact, or account records without code changes."
            className="border-0 bg-transparent p-0"
          />
        ) : (
          FIELD_ENTITIES.map((entity) => {
            const list = grouped[entity] ?? [];
            return (
              <div key={entity} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold capitalize">{entity}s</h4>
                  <Badge variant="outline">{list.length}</Badge>
                  <Separator className="flex-1" />
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-1">
                    No custom fields for {entity}s.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between rounded-md border p-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{f.label}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {f.type}
                            </Badge>
                            {f.required ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-rose-600 dark:text-rose-400"
                              >
                                required
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {f.name}
                            {f.options && f.options.length > 0
                              ? ` · options: ${f.options.join(", ")}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(f.id, f.label)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <AddFieldDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => triggerRefresh()}
      />
    </Card>
  );
}

function AddFieldDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [entity, setEntity] = React.useState<string>("none");
  const [name, setName] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<string>("text");
  const [options, setOptions] = React.useState("");
  const [required, setRequired] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setEntity("none");
    setName("");
    setLabel("");
    setType("text");
    setOptions("");
    setRequired(false);
  };

  const submit = async () => {
    if (entity === "none") {
      toast.error("Select an entity");
      return;
    }
    if (!name.trim() || !label.trim()) {
      toast.error("Field name and label are required");
      return;
    }
    // Validate name is a valid identifier
    if (!/^[a-z][a-zA-Z0-9_]*$/.test(name.trim())) {
      toast.error("Name must be camelCase starting with a lowercase letter");
      return;
    }
    let opts: string[] = [];
    if (options.trim()) {
      opts = options
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if ((type === "select" || type === "multiselect") && opts.length === 0) {
      toast.error("Select/multiselect fields require options");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity,
          name: name.trim(),
          label: label.trim(),
          type,
          options: opts,
          required,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Custom field created");
      reset();
      onOpenChange(false);
      onCreated();
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
          <DialogTitle>Add custom field</DialogTitle>
          <DialogDescription>
            Extend a record type with a new field. Values are stored as JSON.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entity *</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select…</SelectItem>
                  {FIELD_ENTITIES.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-name">Name (camelCase) *</Label>
              <Input
                id="cf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="annualRevenue"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-label">Label *</Label>
              <Input
                id="cf-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Annual Revenue"
              />
            </div>
            {(type === "select" || type === "multiselect") ? (
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="cf-opts">Options (comma-separated)</Label>
                <Input
                  id="cf-opts"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  placeholder="Small, Medium, Large"
                />
              </div>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded"
            />
            Required field
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            Create field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Funnel Stages Tab ============================
function FunnelStagesTab() {
  const { data: stages, loading, error } = useDashboardFetch<FunnelStage[]>(
    "/api/crm/funnels"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [addOpen, setAddOpen] = React.useState(false);

  // Reorder would require a PATCH endpoint that doesn't exist on the backend.
  // We surface this honestly: up/down buttons are shown but disabled with a tooltip.

  return (
    <Card className="glass premium-shadow">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Funnel Stages</CardTitle>
          <CardDescription>
            Stages that leads move through in the funnel engine. New stages are
            appended with the next sort order.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Stage
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        ) : loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !stages || stages.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No funnel stages"
            description="Define the stages leads pass through. New stages get the next sort order."
            className="border-0 bg-transparent p-0"
          />
        ) : (
          <ol className="space-y-2">
            {stages.map((s, idx) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-md border p-2.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {s.code}
                    </Badge>
                    {s.type !== "default" ? (
                      <Badge variant="outline" className="text-[10px]">
                        {s.type}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Order {s.order} · added {timeAgo(s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    title="Reorder requires PATCH /api/crm/funnels/[id]"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled
                    title="Reorder requires PATCH /api/crm/funnels/[id]"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Drag-and-drop reorder is disabled because the funnel PATCH endpoint is
          not implemented. New stages are appended with the next sort order.
        </p>
      </CardContent>

      <AddStageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => triggerRefresh()}
      />
    </Card>
  );
}

function AddStageDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState<string>("default");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setName("");
    setCode("");
    setType("default");
  };

  const submit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(code.trim())) {
      toast.error("Code must be snake_case (lowercase, no spaces)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          type,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Stage added");
      reset();
      onOpenChange(false);
      onCreated();
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
          <DialogTitle>Add funnel stage</DialogTitle>
          <DialogDescription>
            The stage will be appended with the next sort order value.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fs-name">Name *</Label>
            <Input
              id="fs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Discovery"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fs-code">Code (snake_case) *</Label>
            <Input
              id="fs-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="discovery"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">default</SelectItem>
                <SelectItem value="entry">entry</SelectItem>
                <SelectItem value="exit_won">exit_won</SelectItem>
                <SelectItem value="exit_lost">exit_lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            Add stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Meta Pixel Tab ============================
function MetaPixelTab() {
  // Query audit entries related to pixel events. The pixel/track endpoint
  // persists rows to the PixelEvent table (not AuditLog), so this audit count
  // is a best-effort signal — see the honest note in the UI.
  const { data: auditEntries, loading } = useDashboardFetch<AuditEntry[]>(
    "/api/crm/audit?entity=pixelEvent&take=200"
  );
  const [firing, setFiring] = React.useState(false);
  const [lastEventId, setLastEventId] = React.useState<string | null>(null);
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const eventsCount = Array.isArray(auditEntries) ? auditEntries.length : 0;

  const fireTestEvent = async () => {
    setFiring(true);
    try {
      const res = await fetch("/api/pixel/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "TestEvent",
          eventId: `test-${Date.now()}`,
          value: 0,
          currency: "PKR",
          source: "crm-test",
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setLastEventId(json.data?.id ?? null);
      toast.success("Test event fired", {
        description: `Persisted to PixelEvent table (id ${json.data?.id ?? "?"}).`,
      });
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setFiring(false);
    }
  };

  return (
    <>
      <Card className="glass premium-shadow">
        <CardHeader>
          <CardTitle className="text-base">Meta Pixel</CardTitle>
          <CardDescription>
            Pixel is connected via Meta Pixel ID. Browser events are captured
            client-side; server-side Conversions API (CAPI) events are persisted
            via /api/pixel/track into the PixelEvent table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pixel ID
              </p>
              <p className="mt-0.5 font-mono">{META_PIXEL_ID}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Connected
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pixel audit entries
              </p>
              <p className="mt-0.5">
                {loading ? (
                  <Skeleton className="h-4 w-12 inline-block" />
                ) : (
                  eventsCount
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                CAPI server-side
              </p>
              <p className="mt-0.5">/api/pixel/track (persist-only)</p>
            </div>
          </div>

          <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300">
            <strong>Implementation note:</strong> The /api/pixel/track endpoint
            persists pixel events to the PixelEvent table for replay and audit.
            The real Meta Conversions API call (server-to-server event push to
            Meta Graph) requires META_ACCESS_TOKEN and a pixel secret in
            environment variables — without those, events are stored locally
            only. The audit count above reflects AuditLog entries with
            entity=pixelEvent; the PixelEvent table is a separate store.
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={fireTestEvent} disabled={firing}>
              {firing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Flame className="h-4 w-4 mr-1" />
              )}
              Fire Test Event
            </Button>
            {lastEventId ? (
              <span className="text-xs text-muted-foreground font-mono">
                Last event id: {lastEventId}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
