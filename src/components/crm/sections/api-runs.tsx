"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
  Play,
  Plus,
  Server,
  XCircle,
} from "lucide-react";

import { useDashboard } from "@/lib/store";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
type ApiProvider = {
  id: string;
  name: string;
  type: string;
  endpoint: string | null;
  status: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type ApiRun = {
  id: string;
  providerId: string;
  status: string;
  ingested: number;
  validated: number;
  deduped: number;
  written: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  provider: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
};

const PROVIDER_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  connected: {
    label: "Connected",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  disconnected: {
    label: "Disconnected",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  error: {
    label: "Error",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  rate_limited: {
    label: "Rate-limited",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
};

const RUN_STATUS_META: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  running: {
    label: "Running",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    icon: <XCircle className="h-3 w-3" />,
  },
  rate_limited: {
    label: "Rate-limited",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

const PIPELINE_STAGES = [
  "API Provider",
  "API Connector",
  "Authentication",
  "Rate-limit handling",
  "Raw response",
  "Normalizer",
  "Validator",
  "Deduplicator",
  "CRM database",
];

const PIPELINE_ICONS = [
  Server,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Database,
  Database,
  CheckCircle2,
  Database,
  Database,
];

function hasCredentials(config: Record<string, unknown>): boolean {
  const keys = [
    "apiKey",
    "api_key",
    "token",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "oauthToken",
    "credentials",
    "password",
    "username",
  ];
  for (const k of keys) {
    const v = config[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
    if (v && typeof v === "object") return true;
  }
  return false;
}

// ============ Section ============
export function ApiRunsSection() {
  const { triggerRefresh } = useDashboard();
  const providersQ = useDashboardFetch<ApiProvider[]>("/api/crm/api-providers");
  const runsQ = useDashboardFetch<ApiRun[]>("/api/crm/api-runs");

  const [newRunOpen, setNewRunOpen] = React.useState(false);

  const providers = providersQ.data ?? [];
  const runs = runsQ.data ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="API Funnel Run"
        description="Provider ingestion pipeline — connect providers and execute real fetch runs."
        action={
          <Button
            onClick={() => setNewRunOpen(true)}
            disabled={providers.length === 0}
          >
            <Plus className="h-4 w-4" /> New Run
          </Button>
        }
      />

      {/* Pipeline visualization */}
      <ChartCard
        title="API Run Pipeline"
        description="Nine-stage flow: provider → connector → auth → rate-limit → raw response → normalizer → validator → dedup → CRM database."
      >
        <div className="flex flex-wrap items-stretch gap-2">
          {PIPELINE_STAGES.map((label, i) => {
            const Icon = PIPELINE_ICONS[i] ?? Server;
            return (
              <React.Fragment key={label}>
                <div
                  className={cn(
                    "glass flex min-w-[120px] flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-center",
                    i === 0 && "border-blue-500/30",
                    i === PIPELINE_STAGES.length - 1 && "border-emerald-500/30"
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Stage {i + 1}
                  </span>
                  <span className="text-xs font-medium leading-tight">
                    {label}
                  </span>
                </div>
                {i < PIPELINE_STAGES.length - 1 ? (
                  <div className="flex items-center text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </ChartCard>

      {/* Providers grid */}
      <ChartCard
        title="API Providers"
        description="Connected providers power ingestion runs. Disconnected providers fail honestly."
      >
        {providersQ.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : providersQ.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {providersQ.error}
          </p>
        ) : providers.length === 0 ? (
          <EmptyState
            title="No API providers"
            description="Add an API provider via the API to enable ingestion runs."
            icon={Server}
            className="my-4"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                onConnect={async () => {
                  if (!hasCredentials(p.config)) {
                    toast.error(
                      "No credentials configured — set apiKey/token in provider config first"
                    );
                    return;
                  }
                  try {
                    const res = await fetch(`/api/crm/api-providers/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "connected" }),
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      throw new Error(
                        json.error || "Failed to connect provider"
                      );
                    }
                    toast.success(
                      `${p.name} marked connected. Configure real OAuth credentials externally.`
                    );
                    triggerRefresh();
                  } catch (e) {
                    toast.error(
                      e instanceof Error
                        ? e.message
                        : "Failed to connect provider"
                    );
                  }
                }}
              />
            ))}
          </div>
        )}
      </ChartCard>

      {/* Runs table */}
      <ChartCard
        title="API Runs"
        description="Real ingestion attempts. Disconnected providers fail with the actual error message."
      >
        {runsQ.loading ? (
          <Skeleton className="h-40 w-full" />
        ) : runsQ.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {runsQ.error}
          </p>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No API runs yet"
            description="Trigger a new run from a connected provider."
            icon={Play}
            className="my-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ingested</TableHead>
                <TableHead className="text-right">Validated</TableHead>
                <TableHead className="text-right">Deduped</TableHead>
                <TableHead className="text-right">Written</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const meta =
                  RUN_STATUS_META[r.status] ?? {
                    label: r.status || "Unknown",
                    className:
                      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
                    icon: null,
                  };
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {r.provider.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="w-fit text-[10px]"
                        >
                          {r.provider.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          meta.className
                        )}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.ingested}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.validated}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.deduped}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.written}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {r.error ? (
                        <span className="line-clamp-2 text-xs text-rose-600 dark:text-rose-400">
                          {r.error}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeAgo(r.startedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.completedAt ? timeAgo(r.completedAt) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ChartCard>

      <NewRunDialog
        open={newRunOpen}
        onOpenChange={setNewRunOpen}
        providers={providers}
      />
    </div>
  );
}

// ============ Provider card ============
function ProviderCard({
  provider,
  onConnect,
}: {
  provider: ApiProvider;
  onConnect: () => Promise<void>;
}) {
  const [connecting, setConnecting] = React.useState(false);
  const meta =
    PROVIDER_STATUS_META[provider.status] ?? {
      label: provider.status || "Unknown",
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    };

  const handle = async () => {
    setConnecting(true);
    try {
      await onConnect();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="gradient-card premium-shadow flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{provider.name}</p>
          <Badge variant="outline" className="text-[10px] uppercase">
            {provider.type}
          </Badge>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            meta.className
          )}
        >
          {meta.label}
        </span>
      </div>
      {provider.endpoint ? (
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {provider.endpoint}
        </p>
      ) : (
        <p className="text-[11px] italic text-muted-foreground">
          No endpoint configured
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {hasCredentials(provider.config)
            ? "Credentials present"
            : "No credentials"}
        </span>
        <Button
          size="sm"
          variant={provider.status === "connected" ? "secondary" : "outline"}
          onClick={handle}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug className="h-3.5 w-3.5" />
          )}
          {provider.status === "connected" ? "Reconnect" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

// ============ New Run dialog ============
function NewRunDialog({
  open,
  onOpenChange,
  providers,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  providers: ApiProvider[];
}) {
  const { triggerRefresh } = useDashboard();
  const [providerId, setProviderId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setProviderId("");
      setSaving(false);
    }
  }, [open]);

  const selected = providers.find((p) => p.id === providerId);

  const submit = async () => {
    if (!providerId) {
      toast.error("Select a provider first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/api-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, execute: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to start run");
      }
      const data = json.data as ApiRun;
      if (data.status === "failed") {
        toast.error(`Run failed: ${data.error ?? "Unknown error"}`);
      } else if (data.status === "completed") {
        toast.message(`Run completed — ${data.error ?? "0 records ingested"}`);
      } else {
        toast.success("Run created");
      }
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" /> New API Run
          </DialogTitle>
          <DialogDescription>
            Execute a real ingestion attempt against the selected provider.
            Disconnected providers fail honestly with a clear error.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={providerId} onValueChange={setProviderId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {p.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && selected.status !== "connected" ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This provider is <strong>{selected.status}</strong>. The run
                will fail with &ldquo;Provider not connected&rdquo;.
              </span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !providerId}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Execute Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
