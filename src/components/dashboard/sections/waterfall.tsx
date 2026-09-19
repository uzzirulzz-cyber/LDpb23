"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Waves,
  Plus,
  Play,
  Trash2,
  Loader2,
  Database,
  Target,
  TrendingUp,
  Layers,
  Globe,
  Download,
  Handshake,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader, KpiCard, LoadingGrid, ChartCard } from "../shared";
import { timeAgo } from "../ui-helpers";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */

type EnrichmentRun = {
  id: string;
  status: string;
  found: number;
  enriched: number;
  startedAt: string;
  completedAt: string | null;
};

type WaterfallSource = {
  id: string;
  name: string;
  type: string;
  priority: number;
  step: number;
  enabled: boolean;
  found: number;
  converted: number;
  config: { description?: string; endpoint?: string };
  runs: EnrichmentRun[];
  createdAt: string;
};

const SOURCE_TYPES: { value: string; label: string; cls: string; icon: typeof Globe }[] = [
  { value: "api", label: "API", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", icon: Globe },
  { value: "scrape", label: "Scrape", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", icon: Download },
  { value: "import", label: "Import", cls: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", icon: Layers },
  { value: "partner", label: "Partner", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", icon: Handshake },
  { value: "enrichment", label: "Enrichment", cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300", icon: Sparkles },
];

function typeMeta(t: string) {
  return SOURCE_TYPES.find((x) => x.value === t) ?? SOURCE_TYPES[0];
}

function runStatusCls(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "running":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "failed":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  }
}

/* ------------------------------------------------------------------ */
/* Source row (waterfall visualization)                              */
/* ------------------------------------------------------------------ */

function SourceRow({ src, maxFound }: { src: WaterfallSource; maxFound: number }) {
  const { triggerRefresh } = useDashboard();
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = typeMeta(src.type);
  const Icon = meta.icon;
  const rate = src.found > 0 ? (src.converted / src.found) * 100 : 0;
  const pct = maxFound > 0 ? Math.min(100, (src.found / maxFound) * 100) : 0;

  const toggle = async (checked: boolean) => {
    setToggling(true);
    try {
      const res = await fetch(`/api/waterfall/${src.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(checked ? "Source enabled" : "Source disabled", { description: src.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to update source", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setToggling(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/waterfall/${src.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runNow: true }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Enrichment run started", { description: src.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to run source", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setRunning(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/waterfall/${src.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Source deleted", { description: src.name });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete source", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className={cn("card-shadow p-4 transition-opacity", !src.enabled && "opacity-55")}>
      <div className="flex items-center gap-4">
        {/* Step circle */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {src.step}
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
            <span className={cn("h-2 w-2 rounded-full", src.enabled ? "bg-emerald-500" : "bg-slate-400")} />
          </span>
        </div>

        {/* Name + type */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{src.name}</h3>
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", meta.cls)}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {src.config?.description ?? "No description"}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden shrink-0 items-center gap-4 text-right sm:flex">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Found</div>
            <div className="text-sm font-bold tabular-nums">{new Intl.NumberFormat("en-US").format(src.found)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Converted</div>
            <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {new Intl.NumberFormat("en-US").format(src.converted)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rate</div>
            <div className="text-sm font-bold tabular-nums">{rate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-2">
          <Switch checked={src.enabled} onCheckedChange={toggle} disabled={toggling} />
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={runNow}
            disabled={running}
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Run</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Progress + mobile stats */}
      <div className="mt-3 flex items-center gap-3">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {src.found > 0 ? `${pct.toFixed(0)}% of max` : "no runs yet"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs sm:hidden">
        <span><span className="text-muted-foreground">Found:</span> <span className="font-semibold tabular-nums">{src.found}</span></span>
        <span><span className="text-muted-foreground">Conv:</span> <span className="font-semibold tabular-nums text-emerald-600">{src.converted}</span></span>
        <span><span className="text-muted-foreground">Rate:</span> <span className="font-semibold tabular-nums">{rate.toFixed(1)}%</span></span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Add Source dialog                                                  */
/* ------------------------------------------------------------------ */

function AddSourceDialog() {
  const { triggerRefresh } = useDashboard();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("api");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setType("api");
    setDescription("");
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/waterfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          config: { description: description.trim() },
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Source added", { description: `${name.trim()} (${type})` });
      reset();
      setOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to add source", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" /> Add Waterfall Source
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="src-name">Name</Label>
            <Input id="src-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LinkedIn scrape" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="inline-flex items-center gap-1.5">
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-desc">Description</Label>
            <Textarea
              id="src-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this source enrich?"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add Source
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

export function WaterfallSection() {
  const { data: sources, loading, error } = useDashboardFetch<WaterfallSource[]>("/api/waterfall");

  const sorted = useMemo(
    () => [...(sources ?? [])].sort((a, b) => a.step - b.step),
    [sources]
  );

  const maxFound = useMemo(() => sorted.reduce((m, s) => Math.max(m, s.found), 0), [sorted]);

  const totalFound = useMemo(() => sorted.reduce((s, x) => s + x.found, 0), [sorted]);
  const totalConverted = useMemo(() => sorted.reduce((s, x) => s + x.converted, 0), [sorted]);
  const avgRate = totalFound > 0 ? (totalConverted / totalFound) * 100 : 0;

  const recentRuns = useMemo(() => {
    const all: { source: string; type: string; run: EnrichmentRun }[] = [];
    for (const s of sorted) {
      for (const r of s.runs) {
        all.push({ source: s.name, type: s.type, run: r });
      }
    }
    return all.sort((a, b) => new Date(b.run.startedAt).getTime() - new Date(a.run.startedAt).getTime()).slice(0, 10);
  }, [sorted]);

  return (
    <div>
      <SectionHeader
        title="Waterfall Engine"
        description="Tiered enrichment pipeline — sources run in priority order to maximize conversion."
        action={<AddSourceDialog />}
      />

      {loading ? (
        <LoadingGrid count={4} />
      ) : error ? (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600">
            Failed to load waterfall sources: {error}
          </CardContent>
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Sources" value={String(sorted.length)} icon={Database} tone="primary" />
          <KpiCard label="Total Found" value={new Intl.NumberFormat("en-US").format(totalFound)} icon={Target} />
          <KpiCard label="Total Converted" value={new Intl.NumberFormat("en-US").format(totalConverted)} icon={TrendingUp} tone="success" />
          <KpiCard label="Avg Conversion" value={`${avgRate.toFixed(1)}%`} icon={Layers} tone="warning" />
        </div>
      )}

      {/* Waterfall visualization */}
      <ChartCard
        title="Enrichment Waterfall"
        description="Sources ordered by step. Each tier enriches records missed by earlier tiers."
        className="mb-6"
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !loading && sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Waves className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">No sources configured</p>
              <p className="text-xs text-muted-foreground">Add your first enrichment source to begin building the waterfall.</p>
            </div>
            <AddSourceDialog />
          </div>
        ) : (
          <div className="relative space-y-3">
            {/* Connector line */}
            <div className="absolute bottom-4 left-[27px] top-4 w-px bg-border" aria-hidden />
            {sorted.map((src) => (
              <SourceRow key={src.id} src={src} maxFound={maxFound} />
            ))}
          </div>
        )}
      </ChartCard>

      {/* Recent runs */}
      <ChartCard
        title="Recent Enrichment Runs"
        description="Latest execution results across all sources."
      >
        {loading ? (
          <div className="h-32 w-full animate-pulse rounded bg-muted" />
        ) : recentRuns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No runs yet. Click Run on a source to start.</p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">Enriched</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map(({ source, run }) => {
                  const rate = run.found > 0 ? (run.enriched / run.found) * 100 : 0;
                  return (
                    <TableRow key={run.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium">{source}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold capitalize", runStatusCls(run.status))}>
                          {run.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{new Intl.NumberFormat("en-US").format(run.found)}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {new Intl.NumberFormat("en-US").format(run.enriched)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{rate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{timeAgo(run.startedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
