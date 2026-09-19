"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  GitBranch,
  Loader2,
  Pencil,
  Play,
  Plus,
  Send,
  ShieldCheck,
  StickyNote,
  Trash2,
  UserCheck,
  Zap,
} from "lucide-react";

import { useDashboard } from "@/lib/store";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/crm/ui-helpers";
import { ChartCard, EmptyState, SectionHeader } from "@/components/crm/shared";

// ============ Types ============
type RuleCondition = { field: string; operator: string; value: string };
type RuleAction = { type: string; target: string };

type Rule = {
  id: string;
  name: string;
  trigger: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  runs: number;
  lastRunAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "order_placed", label: "Order Placed" },
  { value: "contact_added", label: "Contact Added" },
  { value: "score_threshold", label: "Score Threshold" },
  { value: "status_change", label: "Status Change" },
];

const ACTION_OPTIONS = [
  { value: "assign", label: "Assign", icon: UserCheck },
  { value: "send_message", label: "Send Message", icon: Send },
  { value: "create_task", label: "Create Task", icon: StickyNote },
  { value: "move_stage", label: "Move Stage", icon: GitBranch },
  { value: "notify", label: "Notify", icon: Bell },
];

const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "gt",
  "lt",
  "exists",
];

function actionLabel(type: string): string {
  return ACTION_OPTIONS.find((a) => a.value === type)?.label ?? type;
}

// ============ Section ============
export function RulesSection() {
  const { triggerRefresh } = useDashboard();
  const rulesQ = useDashboardFetch<Rule[]>("/api/crm/rules");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Rule | null>(null);

  const rules = rulesQ.data ?? [];

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (r: Rule) => {
    setEditing(r);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Rules Engine"
        description="Single-step automation rules — trigger + conditions + actions. No multi-step pipelines. Rules execute against real DB events."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        }
      />

      {rulesQ.loading ? (
        <Skeleton className="h-48 w-full" />
      ) : rulesQ.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {rulesQ.error}
        </p>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No rules yet"
          description="Create your first rule to automate lead scoring, routing, or notifications."
          icon={ShieldCheck}
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              onEdit={() => openEdit(r)}
              onToggle={async (enabled) => {
                try {
                  const res = await fetch(`/api/crm/rules/${r.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(json.error || "Failed to update rule");
                  }
                  toast.success(
                    `${r.name} ${enabled ? "enabled" : "disabled"}`
                  );
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to update rule"
                  );
                }
              }}
              onRun={async () => {
                try {
                  const res = await fetch(`/api/crm/rules/${r.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ runNow: true }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(json.error || "Failed to run rule");
                  }
                  toast.success(
                    `${r.name} executed — runs: ${json.data?.runs ?? r.runs + 1}`
                  );
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to run rule"
                  );
                }
              }}
              onDelete={async () => {
                try {
                  const res = await fetch(`/api/crm/rules/${r.id}`, {
                    method: "DELETE",
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(json.error || "Failed to delete rule");
                  }
                  toast.success(`${r.name} deleted`);
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to delete rule"
                  );
                }
              }}
            />
          ))}
        </div>
      )}

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

// ============ Rule card ============
function RuleCard({
  rule,
  onEdit,
  onToggle,
  onRun,
  onDelete,
}: {
  rule: Rule;
  onEdit: () => void;
  onToggle: (enabled: boolean) => Promise<void>;
  onRun: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [toggling, setToggling] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const triggerLabel =
    TRIGGER_OPTIONS.find((t) => t.value === rule.trigger)?.label ?? rule.trigger;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggle(checked);
    } finally {
      setToggling(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      await onRun();
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="gradient-card premium-shadow flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{rule.name}</p>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]"
          >
            <Zap className="h-3 w-3" /> {triggerLabel}
          </Badge>
        </div>
        <Switch
          checked={rule.enabled}
          disabled={toggling}
          onCheckedChange={handleToggle}
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Conditions
          </p>
          {rule.conditions.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No conditions — fires on every trigger
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {rule.conditions.map((c, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]"
                >
                  {c.field} {c.operator} {c.value || "∅"}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Actions
          </p>
          {rule.actions.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              No actions configured
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {rule.actions.map((a, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]"
                >
                  {actionLabel(a.type)}
                  {a.target ? ` → ${a.target}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Runs:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {rule.runs}
          </span>
        </span>
        <span>
          Last run:{" "}
          <span className="font-medium text-foreground">
            {rule.lastRunAt ? timeAgo(rule.lastRunAt) : "never"}
          </span>
        </span>
      </div>

      {rule.lastError ? (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{rule.lastError}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRun}
          disabled={running}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run Now
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ============ Rule dialog ============
function RuleDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Rule | null;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [trigger, setTrigger] = React.useState<string>("lead_created");
  const [conditions, setConditions] = React.useState<RuleCondition[]>([]);
  const [actions, setActions] = React.useState<RuleAction[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setTrigger(editing.trigger);
        setConditions(
          editing.conditions.length > 0
            ? editing.conditions
            : [{ field: "", operator: "equals", value: "" }]
        );
        setActions(
          editing.actions.length > 0
            ? editing.actions
            : [{ type: "assign", target: "" }]
        );
      } else {
        setName("");
        setTrigger("lead_created");
        setConditions([{ field: "", operator: "equals", value: "" }]);
        setActions([{ type: "assign", target: "" }]);
      }
      setSaving(false);
    }
  }, [open, editing]);

  const updateCondition = (i: number, patch: Partial<RuleCondition>) => {
    setConditions((cs) =>
      cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    );
  };
  const addAction = () =>
    setActions((a) => [...a, { type: "assign", target: "" }]);
  const updateAction = (i: number, patch: Partial<RuleAction>) => {
    setActions((as) =>
      as.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
    );
  };
  const removeAction = (i: number) =>
    setActions((as) => as.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        trigger,
        conditions: conditions.filter((c) => c.field.trim() !== ""),
        actions,
      };
      const url = editing ? `/api/crm/rules/${editing.id}` : "/api/crm/rules";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save rule");
      }
      toast.success(editing ? "Rule updated" : "Rule created");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {editing ? "Edit Rule" : "New Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure a single-step rule — one trigger, multiple conditions,
            multiple actions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="High-value SaaS lead"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Conditions</Label>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div
                  key={i}
                  className="glass grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <Input
                    className="h-8 text-xs"
                    placeholder="field"
                    value={c.field}
                    onChange={(e) =>
                      updateCondition(i, { field: e.target.value })
                    }
                  />
                  <Select
                    value={c.operator}
                    onValueChange={(v) => updateCondition(i, { operator: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPERATORS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    placeholder="value"
                    value={c.value}
                    onChange={(e) =>
                      updateCondition(i, { value: e.target.value })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-600 hover:bg-rose-500/10"
                    onClick={() =>
                      setConditions((cs) =>
                        cs.filter((_, idx) => idx !== i)
                      )
                    }
                    disabled={conditions.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setConditions((cs) => [
                  ...cs,
                  { field: "", operator: "equals", value: "" },
                ])
              }
            >
              <Plus className="h-3 w-3" /> Add Condition
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Actions</Label>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div
                  key={i}
                  className="glass grid grid-cols-2 gap-2 rounded-md border p-2"
                >
                  <Select
                    value={a.type}
                    onValueChange={(v) => updateAction(i, { type: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    placeholder="target"
                    value={a.target}
                    onChange={(e) =>
                      updateAction(i, { target: e.target.value })
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-600 hover:bg-rose-500/10"
                    onClick={() => removeAction(i)}
                    disabled={actions.length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={addAction}>
              <Plus className="h-3 w-3" /> Add Action
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editing ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
