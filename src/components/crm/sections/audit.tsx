"use client";

import * as React from "react";
import {
  History,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";

import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState } from "../shared";
import { timeAgo, formatDate } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================ Types ============================
interface AuditEntry {
  id: string;
  actorId: string | null;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string; email: string; image: string | null } | null;
}

// ============================ Constants ============================
const ACTION_META: Record<string, { label: string; color: string }> = {
  create: {
    label: "Create",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  update: {
    label: "Update",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  delete: {
    label: "Delete",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  execute: {
    label: "Execute",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  },
  status_change: {
    label: "Status Change",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  send_message: {
    label: "Send Message",
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  },
  connect_attempt: {
    label: "Connect Attempt",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  connect: {
    label: "Connect",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  disconnect: {
    label: "Disconnect",
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  advance: {
    label: "Advance",
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  },
  abandon: {
    label: "Abandon",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  run: {
    label: "Run",
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  },
};

const ENTITY_OPTIONS = [
  "lead",
  "contact",
  "account",
  "order",
  "customer",
  "inboxThread",
  "integration",
  "customField",
  "funnelStage",
  "funnelRun",
  "apiProvider",
  "apiRun",
  "workflow",
  "rule",
  "waterfallSource",
  "bot",
  "botExecution",
  "pixelEvent",
];

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "execute",
  "status_change",
  "send_message",
  "connect_attempt",
  "connect",
  "disconnect",
  "advance",
  "abandon",
  "run",
];

const ACTOR_OPTIONS = ["system", "admin", "manager", "sales"];

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? {
    label: action,
    color:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.color
      )}
    >
      {meta.label}
    </span>
  );
}

// ============================ Section ============================
const PAGE_SIZE = 100;

export function AuditSection() {
  const refreshKey = useDashboard((s) => s.refreshKey);
  const [entity, setEntity] = React.useState<string>("none");
  const [action, setAction] = React.useState<string>("none");
  const [actor, setActor] = React.useState<string>("none");
  const [skip, setSkip] = React.useState(0);
  const [entries, setEntries] = React.useState<AuditEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Reset when any filter changes
  React.useEffect(() => {
    setSkip(0);
    setEntries([]);
  }, [entity, action, actor]);

  // Fetch page
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const isFirst = skip === 0;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          take: String(PAGE_SIZE),
          skip: String(skip),
        });
        if (entity !== "none") params.set("entity", entity);
        if (action !== "none") params.set("action", action);
        if (actor !== "none") params.set("actor", actor);
        const res = await fetch(`/api/crm/audit?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const page: AuditEntry[] = json.data ?? [];
        setEntries((prev) => (skip === 0 ? page : [...prev, ...page]));
        setTotal(json.total ?? 0);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [entity, action, actor, skip, refreshKey]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasMore = entries.length < total;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Audit Logs"
        description="Immutable record of every mutation across the CRM. Filter by entity, action, or actor."
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="sm:w-[200px] w-full">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All entities</SelectItem>
            {ENTITY_OPTIONS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="sm:w-[180px] w-full">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All actions</SelectItem>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_META[a]?.label ?? a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actor} onValueChange={setActor}>
          <SelectTrigger className="sm:w-[160px] w-full">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All actors</SelectItem>
            {ACTOR_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading audit log: {error}
        </div>
      ) : loading && entries.length === 0 ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit entries yet"
          description="Mutations across the CRM (create, update, delete, execute, status changes) will be logged here automatically."
        />
      ) : (
        <>
          <div className="glass rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const isOpen = expanded.has(e.id);
                  const hasMeta =
                    e.meta && Object.keys(e.meta ?? {}).length > 0;
                  return (
                    <React.Fragment key={e.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-muted/40",
                          hasMeta && "select-none"
                        )}
                        onClick={hasMeta ? () => toggleExpanded(e.id) : undefined}
                      >
                        <TableCell className="w-8">
                          {hasMeta ? (
                            isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div>{formatDate(e.createdAt, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}</div>
                          <div className="text-xs text-muted-foreground">
                            {timeAgo(e.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{e.user?.name ?? e.actor ?? "system"}</div>
                          {e.user?.email ? (
                            <div className="text-xs text-muted-foreground">
                              {e.user.email}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={e.action} />
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {e.entity}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {e.entityId ?? "—"}
                        </TableCell>
                      </TableRow>
                      {isOpen && hasMeta ? (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6}>
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words p-2 rounded-md bg-background/60 border max-h-60 overflow-y-auto scroll-thin">
                              {JSON.stringify(e.meta, null, 2)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {entries.length} of {total} entries
            </span>
            {hasMore ? (
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => setSkip((s) => s + PAGE_SIZE)}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                Load more
              </Button>
            ) : (
              <span className="italic">End of results</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
