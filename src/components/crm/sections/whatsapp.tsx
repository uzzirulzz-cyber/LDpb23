"use client";

// =================================================================
// WhatsApp Business section — two-panel WhatsApp Web-style interface.
// Contacts come from /api/crm/whatsapp/contacts (InboxThread rows on
// the "whatsapp" channel). Messages from /api/crm/inbox/{threadId}.
// Outbound sends go to /api/crm/whatsapp/send which calls the real
// Meta Cloud API (or returns an honest "not configured" error).
// =================================================================

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  MessageCircle,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  ShoppingCart,
  User,
  Video,
  X,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { MiniAvatar, timeAgo, formatDate } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================ Types ============================
interface WhatsAppContact {
  id: string;
  leadId: string | null;
  contactId: string | null;
  customerName: string;
  channel: string;
  subject: string;
  status: string;
  lastMessageAt: string | null;
  unread: number;
  createdAt: string;
  messages: Array<{
    id: string;
    direction: string;
    content: string;
    createdAt: string;
  }>;
}

interface InboxMessage {
  id: string;
  threadId: string;
  direction: "inbound" | "outbound";
  content: string;
  channel: string;
  createdAt: string;
}

interface ThreadDetail extends WhatsAppContact {
  messages: InboxMessage[];
}

interface WhatsAppStatus {
  configured: boolean;
  message: string;
}

interface WhatsAppSendResult {
  ok: boolean;
  providerMsgId: string | null;
  deliveryStatus: string;
  raw: unknown;
  error?: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phones: string[];
  whatsapp: string | null;
  jobTitle: string | null;
  country: string | null;
  city: string | null;
  lifecycleStage: string;
  account: { id: string; name: string; domain: string | null } | null;
}

interface LeadDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  status: string;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customer?: { name: string; email: string } | null;
}

// ============================ Template mirror ============================
// The server-side WHATSAPP_TEMPLATES lives in @/lib/whatsapp, but that
// module imports Prisma (`db`) so it cannot be imported into a client
// component. We mirror the 7 template bodies here — they must stay in
// sync with /src/lib/whatsapp.ts. Clicking a template fills the
// textarea with the raw body ({{placeholders}} included) so the staff
// member can fill them in before sending.
const WHATSAPP_TEMPLATE_KEYS = [
  "order_received",
  "payment_under_review",
  "payment_verified",
  "order_processing",
  "order_completed",
  "payment_failed",
  "verification_required",
] as const;

const TEMPLATE_LABELS: Record<string, string> = {
  order_received: "Order Received",
  payment_under_review: "Payment Under Review",
  payment_verified: "Payment Verified",
  order_processing: "Order Processing",
  order_completed: "Order Completed",
  payment_failed: "Payment Failed",
  verification_required: "Verification Required",
};

const CLIENT_TEMPLATE_BODIES: Record<string, string> = {
  order_received: `Hi {{customer_name}} 👋

Thank you for your Playbeat order!

Order #: {{order_id}}
Amount: {{amount}} {{currency}}

We've received your order and will start processing it right away. You'll get updates here as your order progresses.

— Playbeat Digital`,
  payment_under_review: `Hi {{customer_name}},

We've received your payment for order #{{order_id}} and it's now under verification.

Our team is reviewing the payment and will confirm it shortly. You'll be notified the moment your order moves to processing.

Thanks for your patience 🙏
— Playbeat Digital`,
  payment_verified: `Great news, {{customer_name}}! ✅

Your payment for order #{{order_id}} has been verified and your order is now being processed.

We'll let you know as soon as it's completed.

— Playbeat Digital`,
  order_processing: `Hi {{customer_name}},

Your order #{{order_id}} is now being processed 🛠️

We're preparing your digital delivery / license keys. Hang tight!

— Playbeat Digital`,
  order_completed: `🎉 Your Playbeat order is complete!

Order #: {{order_id}}
Customer: {{customer_name}}

Your digital products / license keys have been delivered to your email. If you have any issues, just reply to this message.

Thanks for choosing Playbeat Digital!
— Playbeat Digital`,
  payment_failed: `Hi {{customer_name}},

Unfortunately, the payment for your Playbeat order #{{order_id}} could not be verified or has failed.

Reason: {{reason}}

You can retry the payment from your account, or contact our support team if you believe this is an error.

— Playbeat Digital`,
  verification_required: `Hi {{customer_name}},

Your payment for order #{{order_id}} requires additional verification. Our team has been notified and will reach out if any further information is needed.

Thanks for your patience 🙏
— Playbeat Digital`,
};

// ============================ Phone persistence ============================
// InboxThread has no `phone` column on the server, so the phone is
// persisted client-side (in localStorage) keyed by thread id. This
// covers contacts added through this UI. For threads created by the
// webhook or elsewhere, the staff member is prompted to set a phone
// before sending — the phone is then cached locally.
const PHONE_STORAGE_KEY = "playbeat_whatsapp_phones";

function loadPhoneMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PHONE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function savePhoneFor(threadId: string, phone: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadPhoneMap();
    map[threadId] = phone;
    window.localStorage.setItem(PHONE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage may be unavailable (private mode) — fail silently.
  }
}

// Mirror of the server-side normalizePhone: strips formatting and
// defaults 0XXXXXXXXXX (Pakistan local) to +92XXXXXXXXXX.
function normalizePhoneDigits(phone: string): string {
  let p = (phone || "").trim();
  if (p.startsWith("+")) p = p.slice(1);
  p = p.replace(/[\s\-()]/g, "");
  if (/^0\d{10}$/.test(p)) p = "92" + p.slice(1);
  return p;
}

function waLink(phone: string): string {
  return `https://wa.me/${normalizePhoneDigits(phone)}`;
}

// ============================ Section ============================
export function WhatsAppSection() {
  const {
    data: statusData,
    loading: statusLoading,
  } = useDashboardFetch<WhatsAppStatus>("/api/crm/whatsapp/status");

  const {
    data: contacts,
    loading,
    error,
  } = useDashboardFetch<WhatsAppContact[]>("/api/crm/whatsapp/contacts");

  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [phoneMap, setPhoneMap] = React.useState<Record<string, string>>({});

  // Hydrate phone map from localStorage on mount.
  React.useEffect(() => {
    setPhoneMap(loadPhoneMap());
  }, []);

  const isConfigured = statusData?.configured ?? false;

  const filtered = React.useMemo(() => {
    if (!contacts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        (phoneMap[c.id] || "").toLowerCase().includes(q) ||
        (c.subject || "").toLowerCase().includes(q)
    );
  }, [contacts, search, phoneMap]);

  const selected = contacts?.find((c) => c.id === selectedId) ?? null;

  // Clear selection if it disappears from the list.
  React.useEffect(() => {
    if (selectedId && contacts && !contacts.find((c) => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [contacts, selectedId]);

  const handleContactAdded = (threadId: string, phone: string) => {
    savePhoneFor(threadId, phone);
    setPhoneMap((prev) => ({ ...prev, [threadId]: phone }));
    setAddOpen(false);
    setSelectedId(threadId);
    triggerRefresh();
  };

  const handleSetPhone = (threadId: string, phone: string) => {
    savePhoneFor(threadId, phone);
    setPhoneMap((prev) => ({ ...prev, [threadId]: phone }));
  };

  return (
    <div className="space-y-4">
      {/* Custom header (this section is full-screen, so no SectionHeader) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "rgba(37, 211, 102, 0.12)" }}
            >
              <MessageCircle className="h-5 w-5" style={{ color: "#25D366" }} />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">
              WhatsApp Business
            </h2>
            {statusLoading ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : isConfigured ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                style={{
                  borderColor: "rgba(37, 211, 102, 0.3)",
                  background: "rgba(37, 211, 102, 0.1)",
                  color: "#25D366",
                }}
              >
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" /> Not configured
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Chat with customers and start WhatsApp calls via the Meta Cloud API.
          </p>
        </div>
      </div>

      {/* Configuration warning banner */}
      {!statusLoading && !isConfigured ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                WhatsApp Business API not configured
              </p>
              <p className="text-amber-600/90 dark:text-amber-300/80">
                Set{" "}
                <code className="rounded bg-amber-500/10 px-1 py-0.5">
                  WHATSAPP_ACCESS_TOKEN
                </code>{" "}
                and{" "}
                <code className="rounded bg-amber-500/10 px-1 py-0.5">
                  WHATSAPP_PHONE_NUMBER_ID
                </code>{" "}
                in environment variables. The Send button below will still
                POST to the API, which returns the real configuration error
                — it will not fake success.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main two-panel layout */}
      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading WhatsApp contacts: {error}
        </div>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Skeleton className="h-[640px] w-full rounded-xl" />
          <Skeleton className="h-[640px] w-full rounded-xl" />
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <div className="glass-navy-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "rgba(37, 211, 102, 0.1)" }}
          >
            <MessageCircle className="h-7 w-7" style={{ color: "#25D366" }} />
          </span>
          <h3 className="mt-4 text-sm font-semibold">No contacts yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first WhatsApp contact to start chatting.
          </p>
          <Button
            className="mt-4"
            style={{ background: "#25D366", color: "#070B19" }}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Contact
          </Button>
        </div>
      ) : (
        <div
          className="grid gap-4 md:grid-cols-[320px_1fr]"
          style={{ minHeight: 640 }}
        >
          {/* ─── Left panel: contact list ─── */}
          <div
            className="glass-navy-card flex flex-col overflow-hidden"
            style={{ maxHeight: 640 }}
          >
            <div className="space-y-2 border-b border-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle
                    className="h-4 w-4"
                    style={{ color: "#25D366" }}
                  />
                  <span className="text-sm font-semibold">WhatsApp</span>
                  {isConfigured ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        borderColor: "rgba(37, 211, 102, 0.3)",
                        background: "rgba(37, 211, 102, 0.1)",
                        color: "#25D366",
                      }}
                    >
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      Not configured
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                style={{ background: "#25D366", color: "#070B19" }}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Contact
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No contacts match &ldquo;{search}&rdquo;
                </div>
              ) : (
                <ul className="space-y-0.5 p-1">
                  {filtered.map((c) => {
                    const isSelected = c.id === selectedId;
                    const phone = phoneMap[c.id] || null;
                    const lastMsg = c.messages?.[0];
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors",
                            isSelected
                              ? "bg-white/5 ring-1 ring-white/10"
                              : "hover:bg-white/[0.03]"
                          )}
                        >
                          <MiniAvatar name={c.customerName} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {c.customerName || "Unknown"}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {c.lastMessageAt
                                  ? timeAgo(c.lastMessageAt)
                                  : "—"}
                              </span>
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {lastMsg
                                ? lastMsg.content
                                : phone
                                  ? phone
                                  : "No messages yet"}
                            </div>
                          </div>
                          {c.unread > 0 ? (
                            <span
                              className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                              style={{
                                background: "#25D366",
                                color: "#070B19",
                              }}
                            >
                              {c.unread}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* ─── Right panel: chat ─── */}
          {selected ? (
            <ChatPane
              key={selected.id}
              contact={selected}
              phone={phoneMap[selected.id] || null}
              isConfigured={isConfigured}
              onSetPhone={(p) => handleSetPhone(selected.id, p)}
              onOpenProfile={() => setProfileOpen(true)}
              onClosed={() => setSelectedId(null)}
            />
          ) : (
            <div
              className="glass-navy-card flex items-center justify-center"
              style={{ minHeight: 640 }}
            >
              <div className="text-center">
                <span
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "rgba(37, 211, 102, 0.1)" }}
                >
                  <MessageCircle
                    className="h-7 w-7"
                    style={{ color: "#25D366" }}
                  />
                </span>
                <h3 className="mt-4 text-sm font-semibold">
                  Select a contact
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a contact from the list to view the conversation and
                  send a message.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <AddContactDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={handleContactAdded}
      />

      {selected ? (
        <ProfileDialog
          contact={selected}
          phone={phoneMap[selected.id] || null}
          open={profileOpen}
          onOpenChange={setProfileOpen}
          onSetPhone={(p) => handleSetPhone(selected.id, p)}
        />
      ) : null}
    </div>
  );
}

// ============================ Chat pane ============================
function ChatPane({
  contact,
  phone,
  isConfigured,
  onSetPhone,
  onOpenProfile,
  onClosed,
}: {
  contact: WhatsAppContact;
  phone: string | null;
  isConfigured: boolean;
  onSetPhone: (phone: string) => void;
  onOpenProfile: () => void;
  onClosed: () => void;
}) {
  const { data: thread, loading, error, refetch } = useDashboardFetch<ThreadDetail>(
    `/api/crm/inbox/${contact.id}`
  );

  const [localMessages, setLocalMessages] = React.useState<InboxMessage[]>([]);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);
  const [noPhoneOpen, setNoPhoneOpen] = React.useState(false);
  const [phoneInput, setPhoneInput] = React.useState("+92 ");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Sync fetched messages into local state. Reset when the thread id
  // changes (i.e. when a different contact is selected).
  React.useEffect(() => {
    if (thread?.messages) {
      setLocalMessages(thread.messages);
    }
  }, [thread?.id, thread?.messages]);

  // Auto-scroll to bottom whenever messages change.
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages.length]);

  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;
    if (!phone) {
      setNoPhoneOpen(true);
      return;
    }

    // Optimistic update: append immediately, rollback on failure.
    const tempId = `temp-${Date.now()}`;
    const optimistic: InboxMessage = {
      id: tempId,
      threadId: contact.id,
      direction: "outbound",
      content,
      channel: "whatsapp",
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    setMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/crm/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message: content,
          threadId: contact.id,
          staffId: "admin",
        }),
      });
      const json = await res.json();
      const result = json?.data as WhatsAppSendResult | undefined;
      if (!res.ok || !result?.ok) {
        const errMsg =
          result?.error || json?.error || `HTTP ${res.status}`;
        toast.error(`Send failed: ${errMsg}`);
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        toast.success("Message sent");
        // Refetch to replace the optimistic row with the real one and
        // pull in any inbound messages that may have arrived.
        refetch();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleTemplateClick = (key: string) => {
    const body = CLIENT_TEMPLATE_BODIES[key];
    if (body) setMessage(body);
    setTemplateOpen(false);
    toast.info(`Loaded template: ${TEMPLATE_LABELS[key]}`);
  };

  const callBtnClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
    phone ? "hover:bg-white/10" : "cursor-not-allowed opacity-50"
  );
  const callBtnStyle = phone
    ? { background: "rgba(37, 211, 102, 0.15)", color: "#25D366" }
    : undefined;

  const onCallClick = (e: React.MouseEvent) => {
    if (!phone) {
      e.preventDefault();
      setNoPhoneOpen(true);
    }
  };

  return (
    <div
      className="glass-navy-card flex flex-col overflow-hidden"
      style={{ maxHeight: 640 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <MiniAvatar name={contact.customerName} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {contact.customerName || "Unknown"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {phone || "No phone — set in profile"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={phone ? waLink(phone) : "#"}
            target={phone ? "_blank" : undefined}
            rel="noopener noreferrer"
            aria-label="Voice call"
            title="Voice call"
            className={callBtnClass}
            style={callBtnStyle}
            onClick={onCallClick}
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={phone ? waLink(phone) : "#"}
            target={phone ? "_blank" : undefined}
            rel="noopener noreferrer"
            aria-label="Video call"
            title="Video call"
            className={callBtnClass}
            style={callBtnStyle}
            onClick={onCallClick}
          >
            <Video className="h-4 w-4" />
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenProfile}>
                <User className="mr-2 h-3.5 w-3.5" /> View Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClosed}>
                <X className="mr-2 h-3.5 w-3.5" /> Close Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-4 scroll-thin"
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-10 w-1/2 rounded-xl",
                  i % 2 === 0 ? "ml-auto" : ""
                )}
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-300">
            Error loading messages: {error}
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground italic">
              No messages yet. Send your first message below.
            </p>
          </div>
        ) : (
          localMessages.map((m) => {
            const isOutbound = m.direction === "outbound";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex max-w-[80%] flex-col",
                  isOutbound ? "ml-auto items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm",
                    isOutbound ? "rounded-br-sm" : "rounded-bl-sm"
                  )}
                  style={
                    isOutbound
                      ? { background: "#25D366", color: "#070B19" }
                      : {
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "#E2E8F0",
                        }
                  }
                >
                  {m.content}
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted-foreground">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="space-y-2 border-t border-white/5 p-3">
        <div className="flex items-center gap-2">
          <DropdownMenu open={templateOpen} onOpenChange={setTemplateOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <FileText className="mr-1 h-3.5 w-3.5" /> Templates
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {WHATSAPP_TEMPLATE_KEYS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleTemplateClick(key)}
                >
                  {TEMPLATE_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {!phone ? (
            <span className="text-xs text-amber-400/80">
              No phone — set in profile to send
            </span>
          ) : !isConfigured ? (
            <span className="text-xs text-amber-400/80">
              API not configured — sends will return an error
            </span>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="max-h-[120px] min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            size="icon"
            className="h-[60px] w-[60px]"
            style={{ background: "#25D366", color: "#070B19" }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for newline
        </p>
      </div>

      {/* Inline "set phone" dialog */}
      <Dialog open={noPhoneOpen} onOpenChange={setNoPhoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set phone number</DialogTitle>
            <DialogDescription>
              Enter the WhatsApp phone number for {contact.customerName}.
              Stored locally in your browser — InboxThread has no phone column
              on the server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="phone-input">Phone (international format preferred)</Label>
            <Input
              id="phone-input"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+92 300 1234567"
            />
            <p className="text-xs text-muted-foreground">
              Defaults to Pakistan (+92) if a local 03xx number is entered.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoPhoneOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const p = phoneInput.trim();
                if (!p) {
                  toast.error("Phone is required");
                  return;
                }
                onSetPhone(p);
                setPhoneInput("+92 ");
                setNoPhoneOpen(false);
                toast.success("Phone saved");
              }}
              style={{ background: "#25D366", color: "#070B19" }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================ Add contact dialog ============================
function AddContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (threadId: string, phone: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("+92 ");
  const [leadId, setLeadId] = React.useState("");
  const [contactId, setContactId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setName("");
    setPhone("+92 ");
    setLeadId("");
    setContactId("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Phone is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/whatsapp/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          leadId: leadId.trim() || null,
          contactId: contactId.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || `Failed: ${res.status}`);
      }
      const thread = json.data as { id: string };
      toast.success(`Contact added: ${name.trim()}`);
      const finalPhone = phone.trim();
      reset();
      onCreated(thread.id, finalPhone);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add WhatsApp contact</DialogTitle>
          <DialogDescription>
            Create a new WhatsApp thread. The phone number is cached locally
            in your browser since the InboxThread table has no phone column.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="wa-name">
              Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="wa-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">
              Phone <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
            />
            <p className="text-xs text-muted-foreground">
              International format preferred. Defaults to Pakistan (+92) if a
              local 03xx number is entered.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-lead">Lead ID (optional)</Label>
              <Input
                id="wa-lead"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                placeholder="clt_..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-contact">Contact ID (optional)</Label>
              <Input
                id="wa-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                placeholder="clt_..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            style={{ background: "#25D366", color: "#070B19" }}
          >
            {saving ? "Adding..." : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Profile dialog ============================
function ProfileDialog({
  contact,
  phone,
  open,
  onOpenChange,
  onSetPhone,
}: {
  contact: WhatsAppContact;
  phone: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSetPhone: (phone: string) => void;
}) {
  const [phoneInput, setPhoneInput] = React.useState(phone || "+92 ");
  const [linkedContact, setLinkedContact] =
    React.useState<ContactDetail | null>(null);
  const [linkedLead, setLinkedLead] = React.useState<LeadDetail | null>(null);
  const [orders, setOrders] = React.useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [linkLoading, setLinkLoading] = React.useState(false);

  // Reset phone input whenever the dialog opens (or contact changes).
  React.useEffect(() => {
    if (open) {
      setPhoneInput(phone || "+92 ");
    }
  }, [open, phone, contact.id]);

  // Lazy-fetch the linked Lead or Contact record to enrich the profile.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLinkedContact(null);
    setLinkedLead(null);
    setOrders([]);

    const run = async () => {
      setLinkLoading(true);
      try {
        if (contact.contactId) {
          const r = await fetch(
            `/api/crm/contacts/${contact.contactId}`,
            { cache: "no-store" }
          );
          if (!cancelled && r.ok) {
            const j = await r.json();
            setLinkedContact(j.data as ContactDetail);
          }
        } else if (contact.leadId) {
          const r = await fetch(`/api/crm/leads/${contact.leadId}`, {
            cache: "no-store",
          });
          if (!cancelled && r.ok) {
            const j = await r.json();
            setLinkedLead(j.data as LeadDetail);
          }
        }
      } catch {
        // ignore — profile still shows basic info
      } finally {
        if (!cancelled) setLinkLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, contact.id, contact.contactId, contact.leadId]);

  // Load order history: search orders by the best available identifier
  // (linked contact email/phone, linked lead phone, or the cached phone).
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOrders([]);
    setOrdersLoading(true);

    const run = async () => {
      const identifier =
        linkedContact?.email ||
        linkedContact?.whatsapp ||
        linkedContact?.phones?.[0] ||
        linkedLead?.email ||
        linkedLead?.phone ||
        linkedLead?.whatsapp ||
        phone;
      if (!identifier) {
        setOrdersLoading(false);
        return;
      }
      try {
        const r = await fetch(
          `/api/crm/orders?search=${encodeURIComponent(identifier)}&limit=20`,
          { cache: "no-store" }
        );
        if (!cancelled && r.ok) {
          const j = await r.json();
          setOrders((j.data ?? []) as OrderListItem[]);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, linkedContact, linkedLead, phone]);

  const isLinkedToCustomer = Boolean(
    contact.contactId || contact.leadId || linkedContact || linkedLead
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Contact details, calling shortcuts, and linked order history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity block */}
          <div className="flex items-center gap-3">
            <MiniAvatar name={contact.customerName} size={48} />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">
                {contact.customerName || "Unknown"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {phone || "No phone on file"}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    borderColor: "rgba(37, 211, 102, 0.3)",
                    background: "rgba(37, 211, 102, 0.1)",
                    color: "#25D366",
                  }}
                >
                  <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {contact.status || "open"}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9"
              style={!phone ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              <a
                href={phone ? waLink(phone) : "#"}
                target={phone ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9"
              style={{
                background: phone ? "#25D366" : "rgba(37, 211, 102, 0.3)",
                color: "#070B19",
                pointerEvents: phone ? undefined : "none",
              }}
            >
              <a
                href={phone ? waLink(phone) : "#"}
                target={phone ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                <Phone className="mr-1 h-3.5 w-3.5" /> Voice
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9"
              style={{
                background: phone ? "#25D366" : "rgba(37, 211, 102, 0.3)",
                color: "#070B19",
                pointerEvents: phone ? undefined : "none",
              }}
            >
              <a
                href={phone ? waLink(phone) : "#"}
                target={phone ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                <Video className="mr-1 h-3.5 w-3.5" /> Video
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Voice &amp; video calls open WhatsApp via{" "}
            <code className="rounded bg-white/5 px-1 py-0.5">wa.me</code> in a
            new tab — the call type is chosen inside the WhatsApp app.
          </p>

          {/* Edit phone */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <Label htmlFor="prof-phone" className="text-xs">
              Phone (cached locally)
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="prof-phone"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+92 300 1234567"
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8"
                style={{ background: "#25D366", color: "#070B19" }}
                onClick={() => {
                  const p = phoneInput.trim();
                  if (!p) {
                    toast.error("Phone is required");
                    return;
                  }
                  onSetPhone(p);
                  toast.success("Phone saved");
                }}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Linked record */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Linked record
            </div>
            {linkLoading ? (
              <Skeleton className="mt-2 h-5 w-32" />
            ) : linkedContact ? (
              <div className="mt-1.5 space-y-1 text-sm">
                <div className="font-medium">
                  {linkedContact.firstName} {linkedContact.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {linkedContact.email}
                  {linkedContact.whatsapp
                    ? ` · WA: ${linkedContact.whatsapp}`
                    : ""}
                </div>
                {linkedContact.account ? (
                  <div className="text-xs text-muted-foreground">
                    Account: {linkedContact.account.name}
                  </div>
                ) : null}
              </div>
            ) : linkedLead ? (
              <div className="mt-1.5 space-y-1 text-sm">
                <div className="font-medium">{linkedLead.name}</div>
                <div className="text-xs text-muted-foreground">
                  {linkedLead.email || "No email"}
                  {linkedLead.phone ? ` · ${linkedLead.phone}` : ""}
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground italic">
                Not linked to a CRM contact or lead.
              </p>
            )}
          </div>

          {/* Order history */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ShoppingCart className="h-3 w-3" /> Order history
            </div>
            {isLinkedToCustomer ? (
              ordersLoading ? (
                <div className="mt-2 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : orders.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground italic">
                  No orders found for this contact.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {orders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {o.orderNumber}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(o.createdAt)} · {o.status}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-medium">
                          {formatMoney(o.total, (o.currency as Currency) || "PKR")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {o.paymentStatus}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground italic">
                Link this contact to a CRM Contact or Lead to surface order
                history.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
