"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  Bell,
  Clock,
  Filter,
  GitBranch,
  Loader2,
  Pencil,
  Play,
  Plus,
  Send,
  StickyNote,
  Trash2,
  UserCheck,
  Workflow as WorkflowIcon,
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
import { Textarea } from "@/components/ui/textarea";
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
type StepType = "trigger" | "condition" | "action" | "wait";

type Step = {
  id: string;
  type: StepType;
  config: Record<string, string>;
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: Step[];
  enabled: boolean;
  runs: number;
  lastRunAt: string | null;
  lastError: string | null;
  owner: string | null;
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

const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "gt", "lt", "exists"];

const STEP_META: Record<
  StepType,
  { label: string; className: string; icon: typeof Zap }
> = {
  trigger: {
    label: "Trigger",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    icon: Zap,
  },
  condition: {
    label: "Condition",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: Filter,
  },
  action: {
    label: "Action",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: Play,
  },
  wait: {
    label: "Wait",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    icon: Clock,
  },
};

const TEMPLATE_STEPS: Array<Omit<Step, "id">> = [
  { type: "trigger", config: { event: "lead_created" } },
  { type: "condition", config: { field: "industry", operator: "equals", value: "SaaS" } },
  { type: "condition", config: { field: "companySize", operator: "gt", value: "50" } },
  { type: "action", config: { type: "assign", target: "SaaS team" } },
  { type: "action", config: { type: "create_task", title: "Follow-up call" } },
  { type: "action", config: { type: "send_message", channel: "email" } },
  { type: "wait", config: { duration: "24h" } },
  { type: "condition", config: { field: "response", operator: "exists", value: "" } },
  { type: "action", config: { type: "move_stage", stage: "qualified" } },
];

// ============ Section ============
export function WorkflowsSection() {
  const { triggerRefresh } = useDashboard();
  const workflowsQ = useDashboardFetch<Workflow[]>("/api/crm/workflows");

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Workflow | null>(null);

  const workflows = workflowsQ.data ?? [];

  const openNew = () => {
    setEditing(null);
    setBuilderOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditing(w);
    setBuilderOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Workflow Engine"
        description="Visual multi-step builder: trigger → conditions → actions → waits. Steps are stored as JSON and executed via the background worker."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        }
      />

      {/* Template example */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WorkflowIcon className="h-4 w-4" /> Example Workflow Template
          </CardTitle>
          <CardDescription>
            &ldquo;New verified lead → Industry=SaaS → Company size&gt;50 →
            Assign to SaaS team → Create follow-up task → Send email → Wait 24h
            → Check response → Move funnel stage.&rdquo;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-stretch gap-1.5">
            {TEMPLATE_STEPS.map((s, i) => {
              const meta = STEP_META[s.type];
              const Icon = meta.icon;
              return (
                <React.Fragment key={i}>
                  <div className="glass flex items-center gap-3 rounded-md border px-3 py-2">
                    <span className="text-[10px] text-muted-foreground">
                      #{i + 1}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        meta.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {describeStep(s)}
                    </span>
                  </div>
                  {i < TEMPLATE_STEPS.length - 1 ? (
                    <div className="flex justify-center text-muted-foreground">
                      <ArrowDown className="h-3 w-3" />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workflow cards */}
      {workflowsQ.loading ? (
        <Skeleton className="h-48 w-full" />
      ) : workflowsQ.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {workflowsQ.error}
        </p>
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="Build your first workflow to automate lead routing and follow-ups."
          icon={WorkflowIcon}
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              onEdit={() => openEdit(w)}
              onToggle={async (enabled) => {
                try {
                  const res = await fetch(`/api/crm/workflows/${w.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      json.error || "Failed to update workflow"
                    );
                  }
                  toast.success(
                    `${w.name} ${enabled ? "enabled" : "disabled"}`
                  );
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to update workflow"
                  );
                }
              }}
              onRun={async () => {
                try {
                  const res = await fetch(`/api/crm/workflows/${w.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ runNow: true }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      json.error || "Failed to run workflow"
                    );
                  }
                  toast.success(
                    `${w.name} executed — runs: ${json.data?.runs ?? w.runs + 1}`
                  );
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to run workflow"
                  );
                }
              }}
              onDelete={async () => {
                try {
                  const res = await fetch(`/api/crm/workflows/${w.id}`, {
                    method: "DELETE",
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      json.error || "Failed to delete workflow"
                    );
                  }
                  toast.success(`${w.name} deleted`);
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to delete workflow"
                  );
                }
              }}
            />
          ))}
        </div>
      )}

      <WorkflowBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editing={editing}
      />
    </div>
  );
}

// ============ Helpers ============
function describeStep(s: Omit<Step, "id">): string {
  if (s.type === "trigger") return `on ${s.config.event ?? "—"}`;
  if (s.type === "condition") {
    return `${s.config.field ?? "?"} ${s.config.operator ?? "?"} ${
      s.config.value || "∅"
    }`;
  }
  if (s.type === "action") {
    const a = ACTION_OPTIONS.find((o) => o.value === s.config.type);
    return `${a?.label ?? s.config.type} → ${
      s.config.target ?? s.config.title ?? s.config.channel ?? s.config.stage ?? ""
    }`;
  }
  if (s.type === "wait") return `wait ${s.config.duration ?? "—"}`;
  return "";
}

function newStepId() {
  return Math.random().toString(36).slice(2, 9);
}

// ============ Workflow card ============
function WorkflowCard({
  workflow,
  onEdit,
  onToggle,
  onRun,
  onDelete,
}: {
  workflow: Workflow;
  onEdit: () => void;
  onToggle: (enabled: boolean) => Promise<void>;
  onRun: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [toggling, setToggling] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const triggerLabel =
    TRIGGER_OPTIONS.find((t) => t.value === workflow.trigger)?.label ??
    workflow.trigger;

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
          <p className="text-sm font-semibold">{workflow.name}</p>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-[10px]"
          >
            <Zap className="h-3 w-3" /> {triggerLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={workflow.enabled}
            disabled={toggling}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>
      {workflow.description ? (
        <p className="text-xs text-muted-foreground">{workflow.description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Steps:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {workflow.steps.length}
          </span>
        </span>
        <span>
          Runs:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {workflow.runs}
          </span>
        </span>
        <span>
          Last run:{" "}
          <span className="font-medium text-foreground">
            {workflow.lastRunAt ? timeAgo(workflow.lastRunAt) : "never"}
          </span>
        </span>
      </div>
      {workflow.lastError ? (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{workflow.lastError}</span>
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

// ============ Builder dialog ============
function WorkflowBuilder({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Workflow | null;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [trigger, setTrigger] = React.useState<string>("lead_created");
  const [steps, setSteps] = React.useState<Step[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description);
        setTrigger(editing.trigger);
        setSteps(
          editing.steps.length > 0
            ? editing.steps.map((s) => ({ ...s, id: s.id || newStepId() }))
            : [
                {
                  id: newStepId(),
                  type: "trigger",
                  config: { event: editing.trigger },
                },
              ]
        );
      } else {
        setName("");
        setDescription("");
        setTrigger("lead_created");
        setSteps([
          {
            id: newStepId(),
            type: "trigger",
            config: { event: "lead_created" },
          },
        ]);
      }
      setSaving(false);
    }
  }, [open, editing]);

  const addStep = (type: StepType) => {
    const config: Record<string, string> =
      type === "trigger"
        ? { event: "lead_created" }
        : type === "condition"
        ? { field: "", operator: "equals", value: "" }
        : type === "action"
        ? { type: "assign", target: "" }
        : { duration: "1h" };
    setSteps((s) => [...s, { id: newStepId(), type, config }]);
  };

  const updateStep = (id: string, config: Record<string, string>) => {
    setSteps((s) =>
      s.map((step) => (step.id === id ? { ...step, config } : step))
    );
  };

  const removeStep = (id: string) => {
    setSteps((s) => s.filter((step) => step.id !== id));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        trigger,
        steps: steps.map(({ type, config }) => ({ type, config })),
      };
      const url = editing
        ? `/api/crm/workflows/${editing.id}`
        : "/api/crm/workflows";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save workflow");
      }
      toast.success(editing ? "Workflow updated" : "Workflow created");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-4 w-4" />
            {editing ? "Edit Workflow" : "New Workflow"}
          </DialogTitle>
          <DialogDescription>
            Build a vertical pipeline: trigger → condition → action → wait →
            condition → action. Steps are stored as JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wf-name">Name</Label>
              <Input
                id="wf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SaaS lead routing"
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
          <div className="space-y-1.5">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this workflow does"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addStep("condition")}
                >
                  <Filter className="h-3 w-3" /> Condition
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addStep("action")}
                >
                  <Play className="h-3 w-3" /> Action
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addStep("wait")}
                >
                  <Clock className="h-3 w-3" /> Wait
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <StepEditor
                  key={s.id}
                  step={s}
                  index={i}
                  onChange={(cfg) => updateStep(s.id, cfg)}
                  onRemove={() => removeStep(s.id)}
                  canRemove={steps.length > 1}
                />
              ))}
            </div>
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
            {editing ? "Save Changes" : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Step editor ============
function StepEditor({
  step,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  step: Step;
  index: number;
  onChange: (cfg: Record<string, string>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const meta = STEP_META[step.type];
  const Icon = meta.icon;
  const cfg = step.config;

  return (
    <div className="glass rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            meta.className
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        {canRemove ? (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-6 w-6 text-rose-600 hover:bg-rose-500/10"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
      {step.type === "trigger" ? (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Event</Label>
          <Select
            value={cfg.event ?? "lead_created"}
            onValueChange={(v) => onChange({ ...cfg, event: v })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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
      ) : step.type === "condition" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Input
            placeholder="field"
            className="h-8 text-xs"
            value={cfg.field ?? ""}
            onChange={(e) => onChange({ ...cfg, field: e.target.value })}
          />
          <Select
            value={cfg.operator ?? "equals"}
            onValueChange={(v) => onChange({ ...cfg, operator: v })}
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
            placeholder="value"
            className="h-8 text-xs"
            value={cfg.value ?? ""}
            onChange={(e) => onChange({ ...cfg, value: e.target.value })}
          />
        </div>
      ) : step.type === "action" ? (
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={cfg.type ?? "assign"}
            onValueChange={(v) => onChange({ ...cfg, type: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="target / value"
            className="h-8 text-xs"
            value={cfg.target ?? cfg.title ?? cfg.channel ?? cfg.stage ?? ""}
            onChange={(e) =>
              onChange({
                ...cfg,
                target: e.target.value,
                title: e.target.value,
                channel: e.target.value,
                stage: e.target.value,
              })
            }
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-[11px]">Duration</Label>
          <Input
            placeholder="24h / 30m / 1d"
            className="h-8 text-xs"
            value={cfg.duration ?? ""}
            onChange={(e) => onChange({ ...cfg, duration: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
