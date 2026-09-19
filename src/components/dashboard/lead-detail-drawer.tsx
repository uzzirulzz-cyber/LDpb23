"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Send,
  Phone as PhoneIcon,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import type { Activity, Lead, Message, Rep } from "@/lib/types";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/types";
import { ACTIVITY_ICONS, MiniAvatar, ScoreBadge, SourceBadge, StatusBadge, STATUS_META, timeAgo } from "./ui-helpers";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadDetail extends Lead {
  activities: Activity[];
  messages: Message[];
  deals: { id: string; title: string; value: number; currency: string; stage: string; closeDate: string | null }[];
}

export function LeadDetailDrawer() {
  const { selectedLeadId, setSelectedLeadId, displayCurrency, triggerRefresh } = useDashboard();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState("meta");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedLeadId) {
        setLead(null);
        return;
      }
      setLoading(true);
      try {
        const [leadRes, repsRes] = await Promise.all([
          fetch(`/api/leads/${selectedLeadId}`).then((r) => r.json()),
          fetch("/api/reps").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setLead(leadRes.data ?? null);
        setReps(repsRes.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedLeadId]);

  async function updateStatus(newStatus: string) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success("Status updated", { description: STATUS_META[newStatus]?.label });
      triggerRefresh();
      const j = await res.json();
      setLead((prev) => (prev ? { ...prev, ...j.data } : prev));
    }
  }

  async function assign(repId: string) {
    if (!lead) return;
    const targetId = repId === "none" ? null : repId;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo: targetId }),
    });
    if (res.ok) {
      const rep = reps.find((r) => r.id === repId);
      toast.success("Assigned", { description: rep?.name ?? "Unassigned" });
      triggerRefresh();
      const j = await res.json();
      setLead((prev) => (prev ? { ...prev, ...j.data } : prev));
    }
  }

  async function sendMessage() {
    if (!lead || !draft.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, channel, content: draft.trim() }),
    });
    if (res.ok) {
      const j = await res.json();
      setLead((prev) => (prev ? { ...prev, messages: [...(prev.messages ?? []), j.data] } : prev));
      setDraft("");
      toast.success("Message sent", { description: `via ${channel}` });
      triggerRefresh();
    }
  }

  return (
    <Sheet open={!!selectedLeadId} onOpenChange={(o) => !o && setSelectedLeadId(null)}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {lead && <MiniAvatar name={lead.name} size="lg" />}
              <div>
                <SheetTitle className="text-lg">{lead?.name ?? "Lead"}</SheetTitle>
                <p className="text-xs text-muted-foreground">{lead?.company ?? lead?.email}</p>
              </div>
            </div>
            {lead && (
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge status={lead.status} />
                <ScoreBadge score={lead.score} />
              </div>
            )}
          </div>
        </SheetHeader>

        {loading && (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Loading lead…
          </div>
        )}

        {lead && !loading && (
          <ScrollArea className="scroll-thin flex-1">
            <div className="space-y-5 p-5">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={PhoneIcon} label="Phone" value={lead.phone} />
                <InfoRow icon={Building2} label="Company" value={lead.company ?? "—"} />
                <InfoRow icon={Globe} label="Country" value={lead.country ?? "—"} />
                <InfoRow icon={Tag} label="Source" value={<SourceBadge source={lead.source} />} />
                <InfoRow icon={TrendingUp} label="Deal Value" value={formatMoney(convert(lead.value, lead.currency as Currency, displayCurrency), displayCurrency)} />
              </div>

              {lead.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.split(",").filter(Boolean).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] uppercase">#{t.trim()}</Badge>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</label>
                  <Select value={lead.status} onValueChange={updateStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[s].dot}`} />
                            {STATUS_META[s].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assign to</label>
                  <Select value={lead.assignedTo ?? "none"} onValueChange={assign}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {reps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Communication center */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Messages</h4>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="scroll-thin max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                  {lead.messages.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">No messages yet.</p>
                  )}
                  {lead.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                        <p>{m.content}</p>
                        <p className={`mt-0.5 text-[9px] ${m.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {m.channel} · {timeAgo(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Send a ${channel} message…`}
                    className="min-h-[40px] resize-none text-xs"
                    rows={2}
                  />
                  <Button size="icon" className="h-auto shrink-0" onClick={sendMessage} disabled={!draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Activity timeline */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity Timeline</h4>
                <div className="relative space-y-3 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                  {lead.activities.map((a) => (
                    <div key={a.id} className="relative flex gap-3 pl-7">
                      <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px]">
                        {ACTIVITY_ICONS[a.type] ?? "•"}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs leading-snug">{a.description}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-medium">{value}</p>
      </div>
    </div>
  );
}
