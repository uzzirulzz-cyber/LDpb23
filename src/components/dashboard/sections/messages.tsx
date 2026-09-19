"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { Lead, Message, Rep } from "@/lib/types";
import { useDashboard } from "@/lib/store";
import { SectionHeader } from "../shared";
import { MiniAvatar, SourceBadge, timeAgo } from "../ui-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, Send, MessageCircle, Facebook, MessageSquare, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHANNEL_META: Record<string, { label: string; icon: typeof Facebook; color: string }> = {
  meta: { label: "Meta Messenger", icon: Facebook, color: "text-blue-600" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-600" },
  sms: { label: "SMS", icon: Smartphone, color: "text-violet-600" },
  email: { label: "Email", icon: Mail, color: "text-amber-600" },
};

export function MessagesSection() {
  const { data: leads, loading } = useDashboardFetch<Lead[]>("/api/leads?limit=300");
  const { setSelectedLeadId, triggerRefresh } = useDashboard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState("meta");
  const [sending, setSending] = useState(false);

  // Conversations = leads (prefer ones with messages; we approximate by treating all as available)
  const conversations = useMemo(() => {
    if (!leads) return [];
    const q = search.toLowerCase();
    return leads.filter((l) =>
      !q || l.name.toLowerCase().includes(q) || (l.company ?? "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  // Auto-select first
  useEffect(() => {
    const pickFirst = () => {
      if (!activeId && conversations.length > 0) setActiveId(conversations[0].id);
    };
    pickFirst();
  }, [conversations, activeId]);

  // Fetch messages for active lead
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeId) {
        setMessages([]);
        return;
      }
      const res = await fetch(`/api/messages?leadId=${activeId}`);
      const j = await res.json();
      if (!cancelled) setMessages(j.data ?? []);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const activeLead = leads?.find((l) => l.id === activeId) ?? null;

  async function send() {
    if (!activeLead || !draft.trim()) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: activeLead.id, channel, content: draft.trim() }),
    });
    if (res.ok) {
      const j = await res.json();
      setMessages((m) => [...m, j.data]);
      setDraft("");
      toast.success("Message sent", { description: `via ${CHANNEL_META[channel].label}` });
      triggerRefresh();
    } else {
      toast.error("Failed to send");
    }
    setSending(false);
  }

  return (
    <div>
      <SectionHeader
        title="Communication Center"
        description="Meta · WhatsApp · SMS · Email — unified inbox"
      />

      <Card className="card-shadow grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="flex flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 pl-9"
              />
            </div>
          </div>
          <ScrollArea className="scroll-thin flex-1">
            {loading && (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}
            {!loading && conversations.map((lead) => {
              const last = messages && lead.id === activeId ? messages[messages.length - 1] : null;
              return (
                <button
                  key={lead.id}
                  onClick={() => setActiveId(lead.id)}
                  className={`flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/40 ${activeId === lead.id ? "bg-primary/5" : ""}`}
                >
                  <MiniAvatar name={lead.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{lead.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(lead.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <SourceBadge source={lead.source} />
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Chat panel */}
        <div className="flex flex-col">
          {activeLead ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <MiniAvatar name={activeLead.name} size="md" />
                  <div>
                    <button
                      onClick={() => setSelectedLeadId(activeLead.id)}
                      className="text-sm font-semibold hover:underline"
                    >
                      {activeLead.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{activeLead.company ?? activeLead.email}</p>
                  </div>
                </div>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_META).map(([k, m]) => {
                      const Icon = m.icon;
                      return (
                        <SelectItem key={k} value={k}>
                          <span className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                            {m.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Messages */}
              <ScrollArea className="scroll-thin flex-1 bg-muted/20 p-4">
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
                      <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                      No messages yet. Start the conversation below.
                    </div>
                  )}
                  {messages.map((m) => {
                    const outbound = m.direction === "outbound";
                    const cm = CHANNEL_META[m.channel] ?? CHANNEL_META.meta;
                    const Icon = cm.icon;
                    return (
                      <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${outbound ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                          <div className={`mb-0.5 flex items-center gap-1 text-[10px] ${outbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {cm.label}
                          </div>
                          <p className="leading-snug">{m.content}</p>
                          <p className={`mt-1 text-[10px] ${outbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {timeAgo(m.createdAt)} · {m.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Send a ${CHANNEL_META[channel].label} message…`}
                    className="min-h-[40px] resize-none text-sm"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button size="icon" className="h-auto shrink-0" onClick={send} disabled={!draft.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Press Enter to send · Shift+Enter for newline
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
