"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plug,
  AlertCircle,
  Settings2,
  X,
  Loader2,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState } from "../shared";
import { timeAgo } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ============================ Types ============================
interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================ Constants ============================
const TYPE_META: Record<string, { color: string; letter: string }> = {
  google: {
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    letter: "G",
  },
  facebook: {
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    letter: "f",
  },
  whatsapp: {
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    letter: "W",
  },
  meta: {
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    letter: "M",
  },
  stripe: {
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    letter: "S",
  },
  sendgrid: {
    color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    letter: "SG",
  },
  twilio: {
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    letter: "T",
  },
  apollo: {
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    letter: "A",
  },
  clearbit: {
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    letter: "C",
  },
  linkedin: {
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    letter: "in",
  },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  connected: {
    label: "Connected",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  disconnected: {
    label: "Disconnected",
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  error: {
    label: "Error",
    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
};

// ============================ Section ============================
export function IntegrationsSection() {
  const { data: integrations, loading, error } = useDashboardFetch<Integration[]>(
    "/api/crm/integrations"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [configureId, setConfigureId] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState<string | null>(null);

  const handleConnect = async (id: string) => {
    setConnecting(id);
    try {
      const res = await fetch(`/api/crm/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connect: true }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      if (json.data?.status === "error") {
        toast.error("Connection failed", {
          description:
            (json.data.config?.error as string | undefined) ??
            "Unknown error",
        });
      } else {
        toast.success("Integration connected");
      }
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect: true }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Integration disconnected");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Integrations"
        description="Connect external platforms. OAuth credentials must be configured in server environment variables — never client-side."
      />

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading integrations: {error}
        </div>
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : !integrations || integrations.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No integrations"
          description="Integration catalog will appear here once seeded via the database. Add integration rows to the Integration table to surface them in this UI."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => {
            const typeMeta =
              TYPE_META[i.type] ?? {
                color:
                  "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
                letter: (i.name?.[0] ?? "?").toUpperCase(),
              };
            const statusMeta = STATUS_META[i.status] ?? STATUS_META.disconnected;
            const errorMsg = i.config?.error as string | undefined;
            const isConnecting = connecting === i.id;
            return (
              <div
                key={i.id}
                className="glass rounded-xl border p-4 space-y-3 premium-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg border font-semibold text-sm shrink-0",
                        typeMeta.color
                      )}
                    >
                      {typeMeta.letter}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{i.name}</h3>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] uppercase tracking-wide",
                          typeMeta.color
                        )}
                      >
                        {i.type}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0",
                      statusMeta.color
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {errorMsg ? (
                  <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-700 dark:text-rose-300">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="break-words">{errorMsg}</span>
                  </div>
                ) : null}

                <div className="text-xs text-muted-foreground">
                  Last sync: {i.lastSync ? timeAgo(i.lastSync) : "Never"}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {i.status === "connected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(i.id)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(i.id)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Plug className="h-3.5 w-3.5 mr-1" />
                      )}
                      Connect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfigureId(i.id)}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1" /> Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfigureDialog
        integrationId={configureId}
        onClose={() => setConfigureId(null)}
      />
    </div>
  );
}

function ConfigureDialog({
  integrationId,
  onClose,
}: {
  integrationId: string | null;
  onClose: () => void;
}) {
  const url = integrationId
    ? `/api/crm/integrations/${integrationId}`
    : "/api/crm/integrations/__none__";
  const { data: integration, loading } = useDashboardFetch<Integration | null>(
    url
  );
  const open = !!integrationId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Configure {integration?.name ?? "integration"}
          </DialogTitle>
          <DialogDescription>
            API credentials are set server-side.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
            Credentials must be set in server environment variables (e.g.
            GOOGLE_CLIENT_ID, FACEBOOK_CLIENT_ID, STRIPE_SECRET_KEY,
            SENDGRID_API_KEY, TWILIO_AUTH_TOKEN, META_ACCESS_TOKEN). They cannot
            be entered client-side for security. The fields below are disabled
            placeholders.
          </div>
          {loading ? null : integration?.config?.error ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-700 dark:text-rose-300">
              Current error: {String(integration.config.error)}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>API Key (placeholder)</Label>
            <Input type="password" placeholder="Set in .env" disabled />
          </div>
          <div className="space-y-1.5">
            <Label>API Secret (placeholder)</Label>
            <Input type="password" placeholder="Set in .env" disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Webhook URL (read-only)</Label>
            <Input
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/api/webhooks/${integration?.type ?? "integration"}`
                  : "/api/webhooks/..."
              }
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              Use this URL when configuring the webhook on the provider side.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
