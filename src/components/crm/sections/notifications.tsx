"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Mail,
  Phone,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  Filter as FilterIcon,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { SectionHeader, EmptyState, KpiCard } from "../shared";
import { timeAgo, formatDate, MiniAvatar } from "../ui-helpers";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

// ============================ Types ============================
interface NotifOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  verificationStatus: string;
  total: number;
  currency: string;
  customer: { id: string; name: string; email: string; phone?: string | null };
}

interface AdminNotification {
  id: string;
  orderId: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  readBy: string | null;
  createdAt: string;
  order?: NotifOrder | null;
}

interface NotifListResponse {
  data: AdminNotification[];
  count: number;
  unreadCount: number;
}

// ============================ Type / icon meta ============================
const TYPE_META: Record<
  string,
  { label: string; className: string; icon: typeof Bell }
> = {
  payment_verification_required: {
    label: "Verification Required",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    icon: AlertTriangle,
  },
  payment_verified: {
    label: "Payment Verified",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: CheckCircle2,
  },
  payment_failed: {
    label: "Payment Failed",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    icon: XCircle,
  },
  order_completed: {
    label: "Order Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: CheckCircle2,
  },
  bot_error: {
    label: "Bot Error",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    icon: AlertTriangle,
  },
  manual_action_required: {
    label: "Manual Action",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: AlertTriangle,
  },
};

function typeMeta(type: string) {
  return (
    TYPE_META[type] ?? {
      label: type || "Notification",
      className:
        "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
      icon: Bell,
    }
  );
}

// ============================ Section ============================
export function NotificationsSection() {
  const { data, loading, error } =
    useDashboardFetch<AdminNotification[]>("/api/crm/notifications");
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const [filter, setFilter] = React.useState<string>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const notifications = data ?? [];
  const total = notifications.length;
  const unread = notifications.filter((n) => !n.isRead).length;

  const filtered = React.useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    let ok = 0;
    let fail = 0;
    try {
      // Sequential PATCH per unread notification — real calls only.
      for (const n of notifications.filter((n) => !n.isRead)) {
        try {
          const res = await fetch(`/api/crm/notifications/${n.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          });
          if (res.ok) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      if (ok > 0) toast.success(`${ok} notification${ok === 1 ? "" : "s"} marked read`);
      if (fail > 0) toast.error(`${fail} failed to update`);
      triggerRefresh();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Notifications"
        description="Admin alerts for payment verifications, bot errors, and manual actions. Click any notification to open the related order."
        action={
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markingAll || unread === 0}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total"
          value={total}
          icon={Bell}
          tone="slate"
          noData={total === 0}
        />
        <KpiCard
          label="Unread"
          value={unread}
          icon={BellOff}
          tone="amber"
          noData={unread === 0}
        />
        <KpiCard
          label="Read"
          value={Math.max(0, total - unread)}
          icon={CheckCheck}
          tone="emerald"
          noData={total === 0}
        />
      </div>

      <div className="flex items-center gap-2">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All notifications</SelectItem>
            <SelectItem value="unread">Unread only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading notifications: {error}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="When payments need verification, bots error, or manual actions are required, alerts will appear here."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = typeMeta(n.type);
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedId(n.id);
                  if (!n.isRead) {
                    void fetch(`/api/crm/notifications/${n.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isRead: true }),
                    }).then(() => triggerRefresh());
                  }
                }}
                className={cn(
                  "group w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/40",
                  n.isRead
                    ? "bg-card/50 border-border"
                    : "bg-amber-50/40 border-amber-500/20 dark:bg-amber-500/[0.04]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                      meta.className
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm truncate",
                          n.isRead ? "font-medium" : "font-semibold"
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          meta.className
                        )}
                      >
                        {meta.label}
                      </span>
                      {n.order ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ShoppingCart className="h-3 w-3" />
                          {n.order.orderNumber}
                        </span>
                      ) : null}
                      {!n.isRead ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unread
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NotificationDetailSheet
        notificationId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

// ============================ Detail sheet ============================
function NotificationDetailSheet({
  notificationId,
  onClose,
}: {
  notificationId: string | null;
  onClose: () => void;
}) {
  const url = notificationId
    ? `/api/crm/notifications`
    : "/api/crm/notifications?take=1";
  const { data, loading, error } = useDashboardFetch<AdminNotification[]>(url);
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const notif = React.useMemo(() => {
    if (!data || !notificationId) return null;
    return data.find((n) => n.id === notificationId) ?? null;
  }, [data, notificationId]);

  const open = !!notificationId;

  const patchOrder = async (orderId: string, action: string, label: string) => {
    try {
      const res = await fetch(`/api/crm/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminUserId: "admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed: ${res.status}`);
      toast.success(label);
      triggerRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notification detail</SheetTitle>
          <SheetDescription>
            Related order + available actions
          </SheetDescription>
        </SheetHeader>
        {!notificationId ? null : loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : !notif ? (
          <p className="p-4 text-sm text-muted-foreground">
            Notification not found.
          </p>
        ) : (
          <div className="p-4 space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const m = typeMeta(notif.type);
                  const Icon = m.icon;
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        m.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {m.label}
                    </span>
                  );
                })()}
                <span className="text-xs text-muted-foreground">
                  {formatDate(notif.createdAt, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="font-semibold text-base">{notif.title}</p>
              <p className="text-sm text-muted-foreground">{notif.message}</p>
            </div>

            {notif.order ? (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">
                      {notif.order.orderNumber}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(notif.order.total, "PKR")}
                  </span>
                </div>

                {notif.order.customer ? (
                  <div className="flex items-center gap-2.5">
                    <MiniAvatar name={notif.order.customer.name} size={32} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notif.order.customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notif.order.customer.email}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Field label="Order">
                    <Badge variant="outline" className="text-[10px]">
                      {notif.order.status}
                    </Badge>
                  </Field>
                  <Field label="Payment">
                    <Badge variant="outline" className="text-[10px]">
                      {notif.order.paymentStatus}
                    </Badge>
                  </Field>
                  <Field label="Verification">
                    <Badge variant="outline" className="text-[10px]">
                      {notif.order.verificationStatus}
                    </Badge>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() =>
                      patchOrder(
                        notif.order!.id,
                        "verify",
                        "Payment verified"
                      )
                    }
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verify Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-500/30 text-rose-700 hover:bg-rose-500/10 dark:text-rose-300"
                    onClick={() =>
                      patchOrder(
                        notif.order!.id,
                        "reject",
                        "Payment rejected"
                      )
                    }
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject Payment
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        useDashboard.setState({ section: "orders" });
                        onClose();
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Orders
                    </Button>
                    {notif.order.customer?.phone ||
                    notif.order.customer?.email ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const target = notif.order!.customer!;
                          if (target.phone) {
                            window.open(
                              `https://wa.me/${target.phone.replace(/[^\d]/g, "")}`,
                              "_blank"
                            );
                          } else if (target.email) {
                            window.location.href = `mailto:${target.email}`;
                          }
                        }}
                      >
                        {notif.order.customer.phone ? (
                          <Phone className="h-3.5 w-3.5" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Contact
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        No contact
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No related order for this notification.
              </div>
            )}

            {!notif.isRead ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/crm/notifications/${notif.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isRead: true }),
                      }
                    );
                    if (!res.ok) throw new Error("Failed");
                    toast.success("Marked as read");
                    triggerRefresh();
                  } catch {
                    toast.error("Failed to mark as read");
                  }
                }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark as Read
              </Button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
