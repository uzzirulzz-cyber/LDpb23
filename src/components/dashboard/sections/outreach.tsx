"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Send,
  Plus,
  Play,
  Pause,
  Trash2,
  Mail,
  MessageCircle,
  Smartphone,
  Facebook,
  Megaphone,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { MiniAvatar, timeAgo } from "../ui-helpers";

// ===== Types =====
interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  audience: number;
  sent: number;
  opened: number;
  replied: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  _count?: { calls: number };
}

interface Call {
  id: string;
  campaignId?: string;
  leadId?: string;
  contactName: string;
  contactPhone: string;
  direction: string;
  durationSec: number;
  status: string;
  notes?: string;
  startedAt: string;
  createdAt: string;
}

// ===== Constants =====
const CHANNEL_META: Record<
  string,
  { label: string; icon: typeof Phone; className: string }
> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  meta: { label: "Meta Ads", icon: Facebook, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  email: { label: "Email", icon: Mail, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  sms: { label: "SMS", icon: Smartphone, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  voip: { label: "VoIP", icon: Phone, className: "bg-primary/10 text-primary" },
};

const CAMPAIGN_STATUS_META: Record<
  string,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20", dot: "bg-slate-500" },
  running: { label: "Running", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500", pulse: true },
  paused: { label: "Paused", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
};

const CALL_STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20" },
  missed: { label: "Missed", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/20" },
  voicemail: { label: "Voicemail", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20" },
  busy: { label: "Busy", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/20" },
};

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// ===== Main =====
export function OutreachSection() {
  const [tab, setTab] = useState("campaigns");

  return (
    <div>
      <SectionHeader
        title="VoIP & Outreach"
        description="Multi-channel campaigns, call logging, and reply analytics."
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-1.5">
            <PhoneCall className="h-3.5 w-3.5" /> Call Log
          </TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="calls">
          <CallsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Campaigns Tab =====
function CampaignsTab() {
  const { data: campaigns, loading, error } = useDashboardFetch<Campaign[]>("/api/campaigns");
  const { triggerRefresh } = useDashboard();
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const list = campaigns ?? [];
    const running = list.filter((c) => c.status === "running").length;
    const totalSent = list.reduce((s, c) => s + (c.sent ?? 0), 0);
    const totalReplied = list.reduce((s, c) => s + (c.replied ?? 0), 0);
    const avgReply = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
    return { total: list.length, running, totalSent, avgReply };
  }, [campaigns]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success(body.launch ? "Campaign launched" : "Campaign updated");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Campaign deleted");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const list = campaigns ?? [];
  const hasData = !loading && !error && list.length > 0;

  return (
    <div className="space-y-4">
      {loading && <LoadingGrid count={4} />}
      {!loading && error && (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600">
            Failed to load: {error}
          </CardContent>
        </Card>
      )}
      {!loading && !error && list.length === 0 && (
        <EmptyState onCreate={() => setNewOpen(true)} />
      )}

      {hasData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Campaigns" value={String(stats.total)} icon={Megaphone} tone="primary" />
            <KpiCard label="Running" value={String(stats.running)} icon={Activity} tone="success" />
            <KpiCard label="Total Sent" value={stats.totalSent.toLocaleString()} icon={Send} tone="default" />
            <KpiCard label="Avg Reply Rate" value={`${stats.avgReply}%`} icon={CheckCircle2} tone="warning" />
          </div>

          {/* Header action */}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => {
              const cm = CHANNEL_META[c.channel] ?? CHANNEL_META.voip;
              const sm = CAMPAIGN_STATUS_META[c.status] ?? CAMPAIGN_STATUS_META.draft;
              const Icon = cm.icon;
              const openRate = pct(c.opened, c.sent);
              const replyRate = pct(c.replied, c.sent);
              const denom = c.audience || 1;
              return (
                <Card key={c.id} className="card-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cm.className}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-sm">{c.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{cm.label}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`gap-1.5 border ${sm.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sm.dot} ${sm.pulse ? "animate-pulse" : ""}`} />
                        {sm.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    {/* Stats with bars */}
                    <div className="space-y-2">
                      <StatBar label="Audience" value={c.audience} max={denom} tone="bg-slate-400" />
                      <StatBar label="Sent" value={c.sent} max={denom} tone="bg-blue-500" />
                      <StatBar label="Opened" value={c.opened} max={denom} tone="bg-amber-500" />
                      <StatBar label="Replied" value={c.replied} max={denom} tone="bg-emerald-500" />
                    </div>

                    <Separator />

                    {/* Rates */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <RateBox label="Open Rate" value={`${openRate}%`} />
                      <RateBox label="Reply Rate" value={`${replyRate}%`} />
                      <RateBox label="Calls" value={String(c._count?.calls ?? 0)} />
                    </div>

                    {/* Message preview */}
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {c.message || <span className="italic">No message set</span>}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-1.5 pt-1">
                      {(c.status === "draft" || c.status === "paused") && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 gap-1.5"
                          disabled={busy === c.id}
                          onClick={() => patch(c.id, { launch: true })}
                        >
                          <Play className="h-3.5 w-3.5" /> Launch
                        </Button>
                      )}
                      {c.status === "running" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          disabled={busy === c.id}
                          onClick={() => patch(c.id, { status: "paused" })}
                        >
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                        disabled={busy === c.id}
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <NewCampaignDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function RateBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-1.5">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function NewCampaignDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [audience, setAudience] = useState("100");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          channel,
          status: "draft",
          audience: Number(audience) || 0,
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Campaign created");
      setName("");
      setChannel("whatsapp");
      setAudience("100");
      setMessage("");
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
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cmp-name">Name</Label>
            <Input
              id="cmp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q4 promo blast"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cmp-channel">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="cmp-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="voip">VoIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmp-audience">Audience</Label>
              <Input
                id="cmp-audience"
                type="number"
                min={0}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cmp-msg">Message</Label>
            <Textarea
              id="cmp-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Hi {{name}}, ..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Calls Tab =====
function CallsTab() {
  const { data: calls, loading, error } = useDashboardFetch<Call[]>("/api/calls");
  const { data: campaigns } = useDashboardFetch<Campaign[]>("/api/campaigns");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    const list = calls ?? [];
    if (campaignFilter === "all") return list;
    return list.filter((c) => c.campaignId === campaignFilter);
  }, [calls, campaignFilter]);

  const stats = useMemo(() => {
    const list = calls ?? [];
    const completed = list.filter((c) => c.status === "completed").length;
    const missed = list.filter((c) => c.status === "missed").length;
    const totalDur = list.reduce((s, c) => s + (c.durationSec ?? 0), 0);
    const avg = list.length > 0 ? Math.round(totalDur / list.length) : 0;
    return { total: list.length, completed, missed, avg };
  }, [calls]);

  if (loading) return <LoadingGrid count={4} />;
  if (error)
    return (
      <Card className="card-shadow">
        <CardContent className="py-10 text-center text-sm text-rose-600">
          Failed to load: {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Calls" value={String(stats.total)} icon={PhoneCall} tone="primary" />
        <KpiCard label="Completed" value={String(stats.completed)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Missed" value={String(stats.missed)} icon={PhoneMissed} tone="danger" />
        <KpiCard label="Avg Duration" value={fmtDuration(stats.avg)} icon={Clock} tone="default" />
      </div>

      {/* Filter bar */}
      <Card className="card-shadow">
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Campaign:</span>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-9 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {(campaigns ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Log Call
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[220px]">Contact</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No calls logged.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((c) => {
                const sm = CALL_STATUS_META[c.status] ?? CALL_STATUS_META.completed;
                const DirIcon = c.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <MiniAvatar name={c.contactName || "?"} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {c.contactName || "Unknown"}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {c.contactPhone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <DirIcon className="h-3.5 w-3.5" />
                        <span className="capitalize">{c.direction}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border ${sm.className}`}>
                        {sm.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {fmtDuration(c.durationSec ?? 0)}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {c.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {timeAgo(c.startedAt ?? c.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <NewCallDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function NewCallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { triggerRefresh } = useDashboard();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [direction, setDirection] = useState("outbound");
  const [durationSec, setDurationSec] = useState("0");
  const [status, setStatus] = useState("completed");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("Phone is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          direction,
          durationSec: Number(durationSec) || 0,
          status,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast.success("Call logged");
      setContactName("");
      setContactPhone("");
      setDirection("outbound");
      setDurationSec("0");
      setStatus("completed");
      setNotes("");
      onOpenChange(false);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Log failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="call-name">Contact Name</Label>
              <Input
                id="call-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-phone">Phone</Label>
              <Input
                id="call-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="call-dir">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger id="call-dir">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-dur">Duration (s)</Label>
              <Input
                id="call-dur"
                type="number"
                min={0}
                value={durationSec}
                onChange={(e) => setDurationSec(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="call-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="call-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="call-notes">Notes</Label>
            <Textarea
              id="call-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Follow-up next week…"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Log Call"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Empty state =====
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="card-shadow">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Megaphone className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">No campaigns yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first outreach campaign to get started.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
