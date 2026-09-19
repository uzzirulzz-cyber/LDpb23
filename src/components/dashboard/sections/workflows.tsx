"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Workflow,
  Plus,
  Play,
  Trash2,
  Loader2,
  Zap,
  Clock,
  Activity,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { timeAgo } from "../ui-helpers";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */

type WorkflowAction = { type: string; config?: Record<string, unknown> };

type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: WorkflowAction[];
  enabled: boolean;
  runs: number;
  lastRunAt: string | null;
  createdAt: string;
};

const TRIGGERS: { value: string; label: string; cls: string }[] = [
  { value: "lead_created", label: "Lead Created", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  { value: "order_placed", label: "Order Placed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { value: "contact_added", label: "Contact Added", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  { value: "score_threshold", label: "Score Threshold", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  { value: "status_change", label: "Status Change", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300" },
];

const ACTION_COLORS: Record<string, string> = {
  send_email: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  send_sms: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  create_task: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  update_field: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  notify: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  assign: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  webhook: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

function triggerMeta(t: string) {
  return TRIGGERS.find((x) => x.value === t) ?? { value: t, label: t, cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" };
}

/* ------------------------------------------------------------------ */
/* Workflow card                                                      */
/* ------------------------------------------------------------------ */

function WorkflowCard({ wf }: { wf: Workflow }) {
  const { triggerRefresh } = useDashboard();
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = triggerMeta(wf.trigger);

  const toggle = async (checked: boolean) => {
    setToggling(true);
    try {
      const res = await fetch(`/api/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(checked ? "Workflow enabled" : "Workflow disabled", { description: wf.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to update workflow", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setToggling(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/workflows/${wf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runNow: true }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Workflow triggered", { description: wf.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to run workflow", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setRunning(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${wf.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Workflow deleted", { description: wf.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete workflow", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className={cn("card-shadow flex flex-col gap-3 p-4 transition-opacity", !wf.enabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="truncate text-sm font-semibold">{wf.name}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {wf.description || "No description provided."}
          </p>
        </div>
        <Switch checked={wf.enabled} onCheckedChange={toggle} disabled={toggling} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={cn("border-transparent text-[11px] font-semibold", meta.cls)}>
          <Zap className="mr-1 h-3 w-3" />
          {meta.label}
        </Badge>
        {wf.actions.length === 0 ? (
          <span className="text-[11px] italic text-muted-foreground">No actions</span>
        ) : (
          wf.actions.map((a, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                ACTION_COLORS[a.type] ?? "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300"
              )}
            >
              <Sparkles className="h-3 w-3" />
              {a.type.replace(/_/g, " ")}
            </span>
          ))
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Activity className="h-3 w-3" />
            <span className="font-semibold text-foreground tabular-nums">{wf.runs}</span> runs
          </span>
          {wf.lastRunAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(wf.lastRunAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2"
            onClick={runNow}
            disabled={running}
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run Now
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* New workflow dialog                                                */
/* ------------------------------------------------------------------ */

function NewWorkflowDialog() {
  const { triggerRefresh } = useDashboard();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<string>("lead_created");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setTrigger("lead_created");
    setEnabled(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          trigger,
          actions: [{ type: "notify", config: {} }],
          enabled,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Workflow created", { description: name.trim() });
      reset();
      setOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create workflow", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> New Workflow
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Name</Label>
            <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot lead alert" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wf-desc">Description</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Enabled</Label>
              <p className="text-xs text-muted-foreground">Activate immediately on creation</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

export function WorkflowsSection() {
  const { data: workflows, loading, error } = useDashboardFetch<Workflow[]>("/api/workflows");

  const enabledCount = (workflows ?? []).filter((w) => w.enabled).length;
  const totalRuns = (workflows ?? []).reduce((s, w) => s + w.runs, 0);
  const activeTriggers = new Set((workflows ?? []).map((w) => w.trigger)).size;

  return (
    <div>
      <SectionHeader
        title="Workflows & Rules"
        description="Automate actions on leads, contacts, and orders with event-driven rules."
        action={<NewWorkflowDialog />}
      />

      {loading ? (
        <LoadingGrid count={3} />
      ) : error ? (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600">
            Failed to load workflows: {error}
          </CardContent>
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Active Workflows" value={`${enabledCount} / ${workflows?.length ?? 0}`} icon={Workflow} tone="primary" />
          <KpiCard label="Total Runs" value={new Intl.NumberFormat("en-US").format(totalRuns)} icon={Activity} tone="success" />
          <KpiCard label="Trigger Types" value={String(activeTriggers)} icon={Zap} footer="Distinct event sources" />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="card-shadow">
              <CardContent className="space-y-3 p-4">
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !loading && (workflows?.length ?? 0) === 0 ? (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Workflow className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">No workflows yet</p>
              <p className="text-xs text-muted-foreground">Create your first automation rule to get started.</p>
            </div>
            <NewWorkflowDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows!.map((wf) => (
            <WorkflowCard key={wf.id} wf={wf} />
          ))}
        </div>
      )}
    </div>
  );
}
