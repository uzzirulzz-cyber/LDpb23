"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Database,
  GitMerge,
  Layers,
  Loader2,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { useDashboard } from "@/lib/store";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
type WaterfallSource = {
  id: string;
  name: string;
  type: string;
  priority: number;
  step: number;
  enabled: boolean;
  found: number;
  converted: number;
  confidence: number;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SOURCE_TYPE_BADGE: Record<string, string> = {
  api: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  webhook:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  manual:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  database:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  enrichment:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

const WATERFALL_RULES = [
  "Query provider #1 (primary source) by lead identifier.",
  "Validate response shape and required fields.",
  "Stop if the result is sufficient (confidence ≥ threshold).",
  "Otherwise, query provider #2 (secondary source).",
  "Merge results — prefer primary on conflict.",
  "Run verification (email/phone/deliverability).",
  "Run enrichment (industry, employees, revenue).",
  "Deduplicate against existing CRM records.",
  "Compute final confidence score from source weights.",
  "Respect opt-out / consent state — never overwrite.",
];

const HIERARCHY = [
  {
    label: "WATERFALL ENGINE",
    icon: Layers,
    className: "border-blue-500/40 bg-blue-500/5",
  },
  {
    label: "Primary Source",
    icon: Target,
    className: "border-violet-500/30",
  },
  {
    label: "Secondary Source",
    icon: Target,
    className: "border-violet-500/30",
  },
  {
    label: "API Provider A",
    icon: Database,
    className: "border-cyan-500/30",
  },
  {
    label: "API Provider B",
    icon: Database,
    className: "border-cyan-500/30",
  },
  {
    label: "Verification",
    icon: ShieldCheck,
    className: "border-amber-500/30",
  },
  {
    label: "Enrichment",
    icon: Sparkles,
    className: "border-amber-500/30",
  },
  {
    label: "Deduplication",
    icon: GitMerge,
    className: "border-rose-500/30",
  },
  {
    label: "Confidence",
    icon: CheckCircle2,
    className: "border-emerald-500/30",
  },
  {
    label: "Lead Record",
    icon: Database,
    className: "border-emerald-500/40 bg-emerald-500/5",
  },
];

// ============ Section ============
export function WaterfallSection() {
  const { triggerRefresh } = useDashboard();
  const sourcesQ = useDashboardFetch<WaterfallSource[]>("/api/crm/waterfall");

  const [addOpen, setAddOpen] = React.useState(false);

  const sources = sourcesQ.data ?? [];
  const sorted = React.useMemo(
    () =>
      [...sources].sort(
        (a, b) => a.step - b.step || a.priority - b.priority
      ),
    [sources]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Waterfall Engine"
        description="Strict provider hierarchy — primary first, secondary fallback, then verification → enrichment → dedup → confidence → lead."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Source
          </Button>
        }
      />

      {/* Hierarchy diagram */}
      <ChartCard
        title="Provider Hierarchy"
        description="The strict waterfall flow — each stage only runs if the previous did not produce sufficient data."
      >
        <div className="flex flex-col items-stretch gap-1.5">
          {HIERARCHY.map((node, i) => {
            const Icon = node.icon;
            return (
              <React.Fragment key={node.label}>
                <div
                  className={cn(
                    "glass flex items-center gap-3 rounded-lg border px-4 py-2.5",
                    node.className
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium">{node.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Level {i + 1}
                  </span>
                </div>
                {i < HIERARCHY.length - 1 ? (
                  <div className="flex justify-center text-muted-foreground">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </ChartCard>

      {/* Sources list */}
      <ChartCard
        title="Configured Sources"
        description="Ordered by step/priority. Toggle enabled or run any source against its providers."
      >
        {sourcesQ.loading ? (
          <Skeleton className="h-48 w-full" />
        ) : sourcesQ.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {sourcesQ.error}
          </p>
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No waterfall sources"
            description="Add a primary and secondary source to start the waterfall engine."
            icon={Target}
            className="my-4"
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((s) => (
              <SourceRow
                key={s.id}
                source={s}
                onToggle={async (enabled) => {
                  try {
                    const res = await fetch(`/api/crm/waterfall/${s.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      throw new Error(
                        json.error || "Failed to update source"
                      );
                    }
                    toast.success(
                      `${s.name} ${enabled ? "enabled" : "disabled"}`
                    );
                    triggerRefresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "Failed to update source"
                    );
                  }
                }}
                onRun={async () => {
                  try {
                    const res = await fetch(`/api/crm/waterfall/${s.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ runNow: true }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      throw new Error(
                        json.error || "Failed to run source"
                      );
                    }
                    if (json.data?.ran === false) {
                      toast.message(
                        `Did not run — ${json.data.reason ?? "no connected providers"}`
                      );
                    } else {
                      toast.success(
                        `${s.name} ran — found ${json.data?.found ?? 0}`
                      );
                    }
                    triggerRefresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "Failed to run source"
                    );
                  }
                }}
              />
            ))}
          </div>
        )}
      </ChartCard>

      {/* Rules + Confidence side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Engine Rules</CardTitle>
            <CardDescription>
              The 10 canonical rules of the waterfall engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {WATERFALL_RULES.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-muted-foreground"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
                    {i + 1}
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-base">Confidence Scoring</CardTitle>
            <CardDescription>
              Per-source confidence contribution to the final lead score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                No sources to score.
              </p>
            ) : (
              <div className="space-y-3">
                {sorted.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {s.name}{" "}
                        <span className="text-muted-foreground">
                          · step {s.step}
                        </span>
                      </span>
                      <span className="tabular-nums">{s.confidence}%</span>
                    </div>
                    <Progress value={s.confidence} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

// ============ Source row ============
function SourceRow({
  source,
  onToggle,
  onRun,
}: {
  source: WaterfallSource;
  onToggle: (enabled: boolean) => Promise<void>;
  onRun: () => Promise<void>;
}) {
  const [toggling, setToggling] = React.useState(false);
  const [running, setRunning] = React.useState(false);

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

  return (
    <div className="gradient-card premium-shadow flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{source.name}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] uppercase",
              SOURCE_TYPE_BADGE[source.type] ??
                "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
            )}
          >
            {source.type}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Step {source.step}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            P{source.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Found:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {source.found}
            </span>
          </span>
          <span>
            Converted:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {source.converted}
            </span>
          </span>
          <span>
            Confidence:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {source.confidence}%
            </span>
          </span>
          <span>Updated {timeAgo(source.updatedAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={source.enabled}
            disabled={toggling}
            onCheckedChange={handleToggle}
          />
          <span className="text-xs text-muted-foreground">
            {source.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRun}
          disabled={running || !source.enabled}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run
        </Button>
      </div>
    </div>
  );
}

// ============ Add Source dialog ============
function AddSourceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<string>("api");
  const [step, setStep] = React.useState("1");
  const [priority, setPriority] = React.useState("10");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("api");
      setStep("1");
      setPriority("10");
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/waterfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          step: Number(step),
          priority: Number(priority),
          enabled: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add source");
      }
      toast.success("Waterfall source added");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add source");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Waterfall Source
          </DialogTitle>
          <DialogDescription>
            Configure a new provider step in the waterfall hierarchy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apollo API"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="enrichment">Enrichment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wf-step">Step</Label>
              <Input
                id="wf-step"
                type="number"
                min={1}
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-priority">Priority</Label>
              <Input
                id="wf-priority"
                type="number"
                min={1}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
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
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
