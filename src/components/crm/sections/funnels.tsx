"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Filter,
  GitBranch,
  Loader2,
  Plus,
  Workflow,
} from "lucide-react";

import { useDashboard } from "@/lib/store";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/crm/ui-helpers";
import { ChartCard, EmptyState, SectionHeader } from "@/components/crm/shared";

// ============ Types ============
type FunnelStage = {
  id: string;
  name: string;
  code: string;
  order: number;
  type: string;
  createdAt: string;
};

type FunnelRunLead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

type FunnelRun = {
  id: string;
  leadId: string;
  currentStage: string;
  stageHistory: Array<{ stage: string; at: string }>;
  status: string;
  startedAt: string;
  completedAt: string | null;
  lead: FunnelRunLead;
};

type Lead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

// Canonical 13-stage spec pipeline (Source → ... → Customer)
const SPEC_PIPELINE = [
  "Source",
  "Ingestion",
  "Normalization",
  "Validation",
  "Enrichment",
  "Verification",
  "Deduplication",
  "Routing",
  "Qualification",
  "Engagement",
  "Proposal",
  "Negotiation",
  "Customer",
];

const RUN_STATUS_META: Record<string, { label: string; className: string }> = {
  running: {
    label: "Running",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  abandoned: {
    label: "Abandoned",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
};

// ============ Section ============
export function FunnelsSection() {
  const { triggerRefresh } = useDashboard();
  const stagesQ = useDashboardFetch<FunnelStage[]>("/api/crm/funnels");
  const runsQ = useDashboardFetch<FunnelRun[]>("/api/crm/funnel-runs");

  const [newRunOpen, setNewRunOpen] = React.useState(false);

  const stages = stagesQ.data ?? [];
  const runs = runsQ.data ?? [];

  const counts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of runs) {
      map[r.currentStage] = (map[r.currentStage] ?? 0) + 1;
    }
    return map;
  }, [runs]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Funnel Engine"
        description="13-stage lead pipeline from raw source to closed customer. Each stage advances a lead through the funnel."
        action={
          <Button onClick={() => setNewRunOpen(true)}>
            <Plus className="h-4 w-4" /> New Run
          </Button>
        }
      />

      {/* Live stage pipeline */}
      <ChartCard
        title="Funnel Stage Pipeline"
        description="Live stages with current lead counts derived from active runs."
      >
        {stagesQ.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : stagesQ.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {stagesQ.error}
          </p>
        ) : stages.length === 0 ? (
          <EmptyState
            title="No funnel stages configured"
            description="Seed the FunnelStage table to populate the pipeline."
            icon={GitBranch}
            className="my-4"
          />
        ) : (
          <div className="flex flex-wrap items-stretch gap-2">
            {stages.map((s, i) => {
              const count = counts[s.code] ?? 0;
              return (
                <React.Fragment key={s.id}>
                  <div className="gradient-card premium-shadow flex min-w-[140px] flex-1 flex-col gap-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        #{s.order}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {s.type}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.code}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-primary">
                        {count}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        leads
                      </span>
                    </div>
                  </div>
                  {i < stages.length - 1 ? (
                    <div className="flex items-center text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Spec pipeline diagram */}
      <ChartCard
        title="Funnel Run Pipeline (Spec)"
        description="Canonical 13-stage flow from source ingestion to customer."
      >
        <div className="flex flex-wrap items-stretch gap-2">
          {SPEC_PIPELINE.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className={cn(
                  "glass flex min-w-[110px] flex-1 flex-col items-center justify-center rounded-lg border px-3 py-2.5 text-center",
                  i === 0 && "border-blue-500/30",
                  i === SPEC_PIPELINE.length - 1 && "border-emerald-500/30"
                )}
              >
                <span className="text-[10px] text-muted-foreground">
                  Step {i + 1}
                </span>
                <span className="text-xs font-medium">{label}</span>
              </div>
              {i < SPEC_PIPELINE.length - 1 ? (
                <div className="flex items-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                </div>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </ChartCard>

      {/* Runs table */}
      <ChartCard
        title="Funnel Runs"
        description="Active and historical funnel runs. Use Advance to move a lead to the next stage."
      >
        {runsQ.loading ? (
          <Skeleton className="h-40 w-full" />
        ) : runsQ.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {runsQ.error}
          </p>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No funnel runs yet"
            description="Create a new run to walk a lead through the funnel stages."
            icon={Filter}
            className="my-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <FunnelRunRow
                  key={r.id}
                  run={r}
                  onAdvance={async () => {
                    try {
                      const res = await fetch(`/api/crm/funnel-runs/${r.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ advance: true }),
                      });
                      const json = await res.json();
                      if (!res.ok) {
                        throw new Error(
                          json.error || "Failed to advance run"
                        );
                      }
                      if (json.data?.status === "completed") {
                        toast.success(
                          `Run completed — ${r.lead.name} reached the final stage.`
                        );
                      } else {
                        toast.success(`Advanced to ${json.data?.currentStage}`);
                      }
                      triggerRefresh();
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Failed to advance run"
                      );
                    }
                  }}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      <NewRunDialog open={newRunOpen} onOpenChange={setNewRunOpen} />
    </div>
  );
}

// ============ Run row ============
function FunnelRunRow({
  run,
  onAdvance,
}: {
  run: FunnelRun;
  onAdvance: () => Promise<void>;
}) {
  const [advancing, setAdvancing] = React.useState(false);
  const meta =
    RUN_STATUS_META[run.status] ?? {
      label: run.status || "Unknown",
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    };

  const handle = async () => {
    setAdvancing(true);
    try {
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{run.lead.name}</span>
          <span className="text-xs text-muted-foreground">
            {run.lead.email ?? "—"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {run.currentStage}
        </Badge>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            meta.className
          )}
        >
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {timeAgo(run.startedAt)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {run.completedAt ? timeAgo(run.completedAt) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {run.status === "running" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handle}
            disabled={advancing}
          >
            {advancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            Advance
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ============ New Run dialog ============
function NewRunDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const leadsQ = useDashboardFetch<Lead[]>("/api/crm/leads?archived=false");
  const leads = leadsQ.data ?? [];
  const [leadId, setLeadId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setLeadId("");
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    if (!leadId) {
      toast.error("Select a lead first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/funnel-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create run");
      }
      toast.success("Funnel run started");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create run");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4" /> New Funnel Run
          </DialogTitle>
          <DialogDescription>
            Select a lead to start them at the first funnel stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {leadsQ.loading ? (
            <Skeleton className="h-9 w-full" />
          ) : leadsQ.error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {leadsQ.error}
            </p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads available. Create a lead first.
            </p>
          ) : (
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                    {l.company ? ` · ${l.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !leadId || leads.length === 0}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Start Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
