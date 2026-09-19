"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import {
  Bug,
  Globe,
  Play,
  Trash2,
  Plus,
  Terminal,
  Activity,
  Search,
  ExternalLink,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { timeAgo } from "../ui-helpers";

// ===== Types =====
interface Crawler {
  id: string;
  name: string;
  targetUrl: string;
  schedule: string;
  status: string;
  found: number;
  lastRunAt: string | null;
  config: Record<string, unknown>;
  _count?: { results: number };
  createdAt: string;
}

interface CrawlerResult {
  id: string;
  title: string;
  url: string;
  price: number | null;
  data: number | null;
  createdAt: string;
}

interface CrawlerWithResults extends Crawler {
  results?: CrawlerResult[];
}

// ===== Constants =====
const SCHEDULE_META: Record<string, { label: string; className: string }> = {
  manual: { label: "Manual", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20" },
  "0 2 * * *": { label: "Daily 2AM", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20" },
  "0 */6 * * *": { label: "Every 6h", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20" },
  "0 0 * * 1": { label: "Weekly Mon", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20" },
};

const STATUS_META: Record<
  string,
  { label: string; dot: string; className: string; pulse?: boolean }
> = {
  idle: { label: "Idle", dot: "bg-slate-500", className: "text-slate-600 dark:text-slate-400" },
  running: { label: "Running", dot: "bg-amber-500", className: "text-amber-600 dark:text-amber-400", pulse: true },
  completed: { label: "Completed", dot: "bg-emerald-500", className: "text-emerald-600 dark:text-emerald-400" },
  error: { label: "Error", dot: "bg-rose-500", className: "text-rose-600 dark:text-rose-400" },
};

const scheduleMeta = (s: string) =>
  SCHEDULE_META[s] ?? {
    label: s === "manual" ? "Manual" : s,
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20",
  };

// ===== Main =====
export function CrawlersSection() {
  const { data: crawlers, loading, error } = useDashboardFetch<Crawler[]>("/api/crawlers");
  const { triggerRefresh } = useDashboard();
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = crawlers ?? [];
    const running = list.filter((c) => c.status === "running").length;
    const totalFound = list.reduce((s, c) => s + (c.found ?? 0), 0);
    const avg = list.length > 0 ? Math.round(totalFound / list.length) : 0;
    return { total: list.length, running, totalFound, avg };
  }, [crawlers]);

  async function runNow(c: Crawler) {
    setBusy(c.id);
    try {
      const res = await fetch(`/api/crawlers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runNow: true }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = await res.json();
      const newResults =
        (json?.data?.newResults as number | undefined) ??
        (json?.newResults as number | undefined) ??
        0;
      toast.success(`Crawl completed, ${newResults} new results`);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: Crawler) {
    setBusy(c.id);
    try {
      const res = await fetch(`/api/crawlers/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Crawler deleted");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const list = crawlers ?? [];

  return (
    <div>
      <SectionHeader
        title="Crawler Lab"
        description="Schedule and run scrapers. Inspect raw crawl results in real time."
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New Crawler
          </Button>
        }
      />

      {loading && <LoadingGrid count={4} />}

      {!loading && error && (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600">
            Failed to load: {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Crawlers" value={String(stats.total)} icon={Bug} tone="primary" />
            <KpiCard label="Running" value={String(stats.running)} icon={Activity} tone="warning" />
            <KpiCard
              label="Total Found"
              value={stats.totalFound.toLocaleString()}
              icon={Database}
              tone="success"
            />
            <KpiCard label="Avg / Crawler" value={String(stats.avg)} icon={Search} tone="default" />
          </div>

          {list.length === 0 ? (
            <Card className="card-shadow mt-4">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bug className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No crawlers yet</p>
                  <p className="text-xs text-muted-foreground">
                    Spin up your first crawler to start collecting data.
                  </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4" /> New Crawler
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => {
                const sm = STATUS_META[c.status] ?? STATUS_META.idle;
                const schedM = scheduleMeta(c.schedule);
                return (
                  <Card
                    key={c.id}
                    onClick={() => setDetailId(c.id)}
                    className="card-shadow group relative cursor-pointer overflow-hidden border-slate-800/60 bg-slate-950/40 transition-colors hover:border-primary/40 hover:bg-slate-950/60 dark:border-slate-800/60 dark:bg-slate-950/40"
                  >
                    {/* Terminal top bar */}
                    <div className="flex items-center gap-1.5 border-b border-slate-800/60 bg-slate-900/60 px-4 py-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        crawler@lab
                      </span>
                      <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${sm.dot} ${sm.pulse ? "animate-pulse" : ""}`}
                        />
                        <span className={sm.className}>{sm.label}</span>
                      </span>
                    </div>
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Globe className="h-4 w-4" />
                          </div>
                          <CardTitle className="truncate font-mono text-sm">{c.name}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`border ${schedM.className}`}>
                          {schedM.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="truncate rounded-md bg-slate-900/70 px-2.5 py-1.5 font-mono text-xs text-emerald-400/90">
                        <span className="text-slate-500">$ </span>
                        {c.targetUrl}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <Stat label="Found" value={String(c.found ?? 0)} />
                        <Stat label="Results" value={String(c._count?.results ?? 0)} />
                        <Stat
                          label="Last Run"
                          value={c.lastRunAt ? timeAgo(c.lastRunAt) : "—"}
                        />
                      </div>
                      <Separator className="bg-slate-800/60" />
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 gap-1.5"
                          disabled={busy === c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void runNow(c);
                          }}
                        >
                          <Play className="h-3.5 w-3.5" /> Run
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                          disabled={busy === c.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void remove(c);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <NewCrawlerDialog open={newOpen} onOpenChange={setNewOpen} />
      {detailId && (
        <CrawlerDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-1.5">
      <p className="font-mono text-sm font-semibold tabular-nums text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function NewCrawlerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [schedule, setSchedule] = useState("manual");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!targetUrl.trim()) {
      toast.error("Target URL is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crawlers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetUrl: targetUrl.trim(),
          schedule,
          config: { description: description.trim() },
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Crawler created");
      setName("");
      setTargetUrl("");
      setSchedule("manual");
      setDescription("");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4" /> New Crawler
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="crw-name">Name</Label>
            <Input
              id="crw-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Competitor price monitor"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crw-url">Target URL</Label>
            <Input
              id="crw-url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/products"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crw-sched">Schedule</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger id="crw-sched">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="0 2 * * *">Daily (02:00)</SelectItem>
                <SelectItem value="0 */6 * * *">Every 6 hours</SelectItem>
                <SelectItem value="0 0 * * 1">Weekly (Mon 00:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crw-desc">Description</Label>
            <Input
              id="crw-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Track price changes & new SKUs"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Creating…" : "Create Crawler"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CrawlerDetailDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <CrawlerDetailContent id={id} />
      </DialogContent>
    </Dialog>
  );
}

function CrawlerDetailContent({ id }: { id: string }) {
  const { data: crawler, loading, error } = useDashboardFetch<CrawlerWithResults>(
    `/api/crawlers/${id}`
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-mono">
          <Terminal className="h-4 w-4 text-primary" />
          {crawler?.name ?? "Crawler results"}
        </DialogTitle>
      </DialogHeader>
      {crawler && (
        <div className="truncate rounded-md bg-slate-900/70 px-3 py-2 font-mono text-xs text-emerald-400/90">
          <span className="text-slate-500">$ </span>
          {crawler.targetUrl}
        </div>
      )}
      {loading && (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading results…</p>
      )}
      {!loading && error && (
        <p className="py-8 text-center text-sm text-rose-600">Failed to load: {error}</p>
      )}
      {!loading && !error && crawler && (
        <div className="scroll-thin max-h-[420px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!crawler.results || crawler.results.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No results yet. Run the crawler to collect data.
                  </TableCell>
                </TableRow>
              )}
              {crawler.results?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[220px] truncate text-sm font-medium">
                    {r.title}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 truncate font-mono text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.url}</span>
                    </a>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {r.price != null ? `$${r.price}` : "—"}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs tabular-nums">
                    {r.data ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {timeAgo(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
