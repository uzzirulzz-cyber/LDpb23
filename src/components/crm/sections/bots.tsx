"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  Bot as BotIcon,
  CheckCircle2,
  Cpu,
  Gauge,
  Inbox,
  Loader2,
  Play,
  Plus,
  ShoppingBag,
  Sparkles,
  Timer,
  Workflow as WorkflowIcon,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { BotStatusBadge, timeAgo } from "@/components/crm/ui-helpers";
import { ChartCard, EmptyState, SectionHeader } from "@/components/crm/shared";

// ============ Types ============
type Bot = {
  id: string;
  name: string;
  role: string;
  provider: string | null;
  status: string;
  currentJob: string | null;
  queue: number;
  executions: number;
  successes: number;
  failures: number;
  latencyMs: number;
  lastHeartbeat: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type BotExecution = {
  id: string;
  botId: string;
  job: string;
  status: string;
  durationMs: number;
  result: Record<string, unknown>;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
};

const ROLE_OPTIONS = [
  { value: "ingestion", label: "Ingestion", icon: Inbox },
  { value: "verification", label: "Verification", icon: CheckCircle2 },
  { value: "enrichment", label: "Enrichment", icon: Sparkles },
  { value: "dedup", label: "Dedup", icon: Cpu },
  { value: "routing", label: "Routing", icon: WorkflowIcon },
  { value: "workflow", label: "Workflow", icon: WorkflowIcon },
  { value: "support", label: "Support", icon: Inbox },
  { value: "checkout", label: "Checkout", icon: ShoppingBag },
  { value: "notification", label: "Notification", icon: Activity },
];

const ROLE_META: Record<string, { label: string; icon: typeof Cpu }> = {
  ingestion: { label: "Ingestion", icon: Inbox },
  verification: { label: "Verification", icon: CheckCircle2 },
  enrichment: { label: "Enrichment", icon: Sparkles },
  dedup: { label: "Dedup", icon: Cpu },
  routing: { label: "Routing", icon: WorkflowIcon },
  workflow: { label: "Workflow", icon: WorkflowIcon },
  support: { label: "Support", icon: Inbox },
  checkout: { label: "Checkout", icon: ShoppingBag },
  notification: { label: "Notification", icon: Activity },
};

const EXEC_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  running: {
    label: "Running",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  success: {
    label: "Success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
};

function describeResult(result: Record<string, unknown>): string {
  const keys = Object.keys(result).filter((k) => k !== "role");
  if (keys.length === 0) return "no detail";
  return keys
    .map((k) => `${k}: ${String(result[k])}`)
    .join(" · ");
}

// ============ Section ============
export function BotsSection() {
  const { triggerRefresh } = useDashboard();
  const botsQ = useDashboardFetch<Bot[]>("/api/crm/bots");

  const [addOpen, setAddOpen] = React.useState(false);
  const [executions, setExecutions] = React.useState<BotExecution[]>([]);
  const [executingId, setExecutingId] = React.useState<string | null>(null);

  const bots = botsQ.data ?? [];

  // Lazy-load recent executions per bot (aggregated).
  React.useEffect(() => {
    if (bots.length === 0) {
      setExecutions([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const results = await Promise.all(
        bots.map(async (b) => {
          try {
            const res = await fetch(`/api/crm/bots/${b.id}`, {
              cache: "no-store",
            });
            if (!res.ok) return [];
            const json = await res.json();
            const recent = (json.data?.recentExecutions ?? []) as Array<
              BotExecution & { bot?: { name?: string } }
            >;
            return recent.map((e) => ({
              ...e,
              botName: b.name,
            }));
          } catch {
            return [];
          }
        })
      );
      if (cancelled) return;
      const flat = results
        .flat()
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
        .slice(0, 25);
      setExecutions(flat as BotExecution[]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [bots]);

  const handleExecute = async (bot: Bot) => {
    setExecutingId(bot.id);
    try {
      const res = await fetch(`/api/crm/bots/${bot.id}/execute`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to execute bot");
      }
      const found = (json.data?.result?.found as number) ?? 0;
      const duration = json.data?.durationMs ?? 0;
      toast.success(
        `${bot.name} executed — found ${found} · ${duration}ms`
      );
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to execute bot");
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bot Manager"
        description="Real worker framework — 9 role-based bots execute live DB queries. Status reflects actual backend state: idle until first execution."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Bot
          </Button>
        }
      />

      {/* Bot grid */}
      {botsQ.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : botsQ.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {botsQ.error}
        </p>
      ) : bots.length === 0 ? (
        <EmptyState
          title="No bots registered"
          description="Add bots for each of the 9 roles (ingestion, verification, enrichment, dedup, routing, workflow, support, checkout, notification)."
          icon={BotIcon}
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Bot
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((b) => (
            <BotCard
              key={b.id}
              bot={b}
              executing={executingId === b.id}
              onExecute={() => handleExecute(b)}
              onToggle={async (enabled) => {
                try {
                  const res = await fetch(`/api/crm/bots/${b.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enabled, status: enabled ? "idle" : "disabled" }),
                  });
                  const json = await res.json();
                  if (!res.ok) {
                    throw new Error(json.error || "Failed to update bot");
                  }
                  toast.success(
                    `${b.name} ${enabled ? "enabled" : "disabled"}`
                  );
                  triggerRefresh();
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to update bot"
                  );
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Recent executions table */}
      <ChartCard
        title="Recent Executions"
        description="Aggregated execution log across all bots — most recent first."
      >
        {executions.length === 0 ? (
          <EmptyState
            title="No executions yet"
            description="Execute a bot to populate this log with real DB queries."
            icon={Activity}
            className="my-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bot</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((e) => {
                const meta =
                  EXEC_STATUS_META[e.status] ?? {
                    label: e.status || "Unknown",
                    className:
                      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
                  };
                const botName =
                  (e as BotExecution & { botName?: string }).botName ??
                  bots.find((b) => b.id === e.botId)?.name ??
                  e.botId;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{botName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {e.job}
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
                    <TableCell className="text-right tabular-nums text-xs">
                      {e.durationMs}ms
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {describeResult(e.result)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(e.startedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      <AddBotDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

// ============ Bot card ============
function BotCard({
  bot,
  executing,
  onExecute,
  onToggle,
}: {
  bot: Bot;
  executing: boolean;
  onExecute: () => void;
  onToggle: (enabled: boolean) => Promise<void>;
}) {
  const [toggling, setToggling] = React.useState(false);
  const roleMeta = ROLE_META[bot.role];
  const RoleIcon = roleMeta?.icon ?? BotIcon;

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await onToggle(checked);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="gradient-card premium-shadow flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RoleIcon className="h-4 w-4" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{bot.name}</p>
            <Badge
              variant="outline"
              className="text-[10px] uppercase"
            >
              {roleMeta?.label ?? bot.role}
            </Badge>
          </div>
        </div>
        <Switch
          checked={bot.enabled}
          disabled={toggling}
          onCheckedChange={handleToggle}
        />
      </div>

      <div className="flex items-center justify-between">
        <BotStatusBadge status={bot.status} />
        {bot.provider ? (
          <span className="text-[10px] text-muted-foreground">
            via {bot.provider}
          </span>
        ) : null}
      </div>

      {bot.currentJob ? (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Running: {bot.currentJob}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center">
        <Metric label="Exec" value={bot.executions} />
        <Metric label="OK" value={bot.successes} tone="emerald" />
        <Metric label="Fail" value={bot.failures} tone="rose" />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Gauge className="h-3 w-3" />
          {bot.latencyMs > 0 ? `${bot.latencyMs}ms` : "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {bot.lastHeartbeat ? timeAgo(bot.lastHeartbeat) : "never"}
        </span>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onExecute}
        disabled={executing || !bot.enabled}
      >
        {executing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        Execute
      </Button>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : "text-foreground";
  return (
    <div className="space-y-0.5">
      <p className={cn("text-sm font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

// ============ Add Bot dialog ============
function AddBotDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<string>("ingestion");
  const [provider, setProvider] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setRole("ingestion");
      setProvider("");
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
      const res = await fetch("/api/crm/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          provider: provider.trim() || null,
          enabled: true,
          status: "idle",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add bot");
      }
      toast.success("Bot registered");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add bot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BotIcon className="h-4 w-4" /> Add Bot
          </DialogTitle>
          <DialogDescription>
            Register a new worker bot. Status starts idle; the first execution
            runs the real role-based DB query.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bot-name">Name</Label>
            <Input
              id="bot-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingestion Worker"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bot-provider">Provider (optional)</Label>
            <Input
              id="bot-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="apollo / clearbit / internal"
            />
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
            Register Bot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
