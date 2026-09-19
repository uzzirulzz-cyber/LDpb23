"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Facebook,
  MessageCircle,
  Mail,
  Smartphone,
  Globe,
  Plus,
  Send,
  Inbox as InboxIcon,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState } from "../shared";
import { MiniAvatar, timeAgo } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================ Types ============================
type Channel = "meta" | "whatsapp" | "email" | "sms" | "web";

interface InboxMessage {
  id: string;
  threadId: string;
  direction: "inbound" | "outbound";
  content: string;
  channel: string;
  createdAt: string;
}

interface InboxThread {
  id: string;
  leadId: string | null;
  contactId: string | null;
  customerName: string;
  channel: Channel;
  subject: string;
  status: "open" | "pending" | "closed";
  lastMessageAt: string;
  unread: number;
  createdAt: string;
}

interface ThreadDetail extends InboxThread {
  messages: InboxMessage[];
}

// ============================ Constants ============================
const CHANNEL_META: Record<Channel, { label: string; icon: React.ElementType }> = {
  meta: { label: "Meta", icon: Facebook },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: Smartphone },
  web: { label: "Web", icon: Globe },
};

const THREAD_STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  open: {
    label: "Open",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  closed: {
    label: "Closed",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  },
};

function ThreadStatusBadge({ status }: { status: string }) {
  const meta = THREAD_STATUS_META[status] ?? THREAD_STATUS_META.closed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

// ============================ Section ============================
export function InboxSection() {
  const { data: threads, loading, error } = useDashboardFetch<InboxThread[]>(
    "/api/crm/inbox"
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);

  // Clear selection if it disappears from the list
  React.useEffect(() => {
    if (selectedId && threads && !threads.find((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [threads, selectedId]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/crm/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success(`Thread ${status}`);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Unified Inbox"
        description="All customer conversations across Meta, WhatsApp, email, SMS, and web chat."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Thread
          </Button>
        }
      />

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading inbox: {error}
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          <Skeleton className="h-[600px] w-full rounded-xl" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      ) : !threads || threads.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No conversations"
          description="Inbox threads are created when customers message via connected channels or when you start a new thread manually."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          <div className="glass rounded-xl border p-2 max-h-[600px] overflow-y-auto scroll-thin">
            <ul className="space-y-1">
              {threads.map((t) => {
                const meta = CHANNEL_META[t.channel] ?? CHANNEL_META.web;
                const Icon = meta.icon;
                const isSelected = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "w-full text-left rounded-lg p-3 transition-colors",
                        isSelected
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <MiniAvatar name={t.customerName} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">
                              {t.customerName || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {timeAgo(t.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {t.subject || meta.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <ThreadStatusBadge status={t.status} />
                            {t.unread > 0 ? (
                              <Badge className="bg-primary text-primary-foreground">
                                {t.unread}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedId ? (
            <ThreadPane
              key={selectedId}
              threadId={selectedId}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <EmptyState
              icon={InboxIcon}
              title="Select a conversation"
              description="Pick a thread from the list to view messages and reply."
            />
          )}
        </div>
      )}

      <NewThreadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => triggerRefresh()}
      />
    </div>
  );
}

function ThreadPane({
  threadId,
  onStatusChange,
}: {
  threadId: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { data: thread, loading, error } = useDashboardFetch<ThreadDetail>(
    `/api/crm/inbox/${threadId}`
  );
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);
  const [content, setContent] = React.useState("");
  const [channel, setChannel] = React.useState<Channel | "none">("none");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (thread) {
      setChannel("none");
      setContent("");
    }
  }, [thread?.id]);  

  const handleSend = async () => {
    if (!thread || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/crm/inbox/${thread.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: "outbound",
          content: content.trim(),
          channel: channel === "none" ? thread.channel : channel,
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Message sent");
      setContent("");
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-[600px] w-full rounded-xl" />;
  }
  if (error || !thread) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
        {error || "Thread not found"}
      </div>
    );
  }

  const meta = CHANNEL_META[thread.channel] ?? CHANNEL_META.web;
  const Icon = meta.icon;

  return (
    <div className="glass rounded-xl border flex flex-col max-h-[600px] premium-shadow">
      <div className="flex items-start justify-between gap-3 p-4 border-b">
        <div className="flex items-start gap-3 min-w-0">
          <MiniAvatar name={thread.customerName} size={40} />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">
              {thread.customerName || "Unknown"}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Icon className="h-3 w-3 shrink-0" />
              <span>{meta.label}</span>
              <span>·</span>
              <span className="truncate">
                {thread.subject || "No subject"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThreadStatusBadge status={thread.status} />
          {thread.status !== "closed" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(thread.id, "closed")}
            >
              Close
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(thread.id, "open")}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-thin">
        {thread.messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground italic py-8">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          thread.messages.map((m) => {
            const isOutbound = m.direction === "outbound";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isOutbound ? "ml-auto items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isOutbound
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
                <span className="text-xs text-muted-foreground mt-1 px-1">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Select
            value={channel}
            onValueChange={(v) => setChannel(v as Channel | "none")}
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default channel</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="web">Web</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            Reply will be sent as {meta.label}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a reply..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">⌘+Enter to send</p>
      </div>
    </div>
  );
}

function NewThreadDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = React.useState("");
  const [channel, setChannel] = React.useState<Channel | "none">("none");
  const [subject, setSubject] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setCustomerName("");
    setChannel("none");
    setSubject("");
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (channel === "none") {
      toast.error("Select a channel");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          channel,
          subject: subject.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      toast.success("Thread created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Start a new thread. You can reply once it&apos;s created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cust">Customer name</Label>
            <Input
              id="cust"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as Channel | "none")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select…</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subj">Subject</Label>
            <Input
              id="subj"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Order #PB-123 question"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            Create thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
