"use client";

import * as React from "react";
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Bot as BotIcon,
  Bell,
  Mail,
  MessageCircle,
  History,
  Banknote,
  ArrowRight,
} from "lucide-react";

import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

import {
  SectionHeader,
  ChartCard,
  EmptyState,
  LoadingGrid,
  KpiCard,
} from "../shared";
import {
  BotStatusBadge,
  MiniAvatar,
  timeAgo,
} from "../ui-helpers";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ============================ Types ============================
interface DashboardKpis {
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  pipelineValuePkr: number;
  revenuePkr: number;
  ordersCount: number;
  customersCount: number;
  activeBots: number;
  idleBots: number;
  funnelsRunning: number;
  apiRunsToday: number;
  // Production order workflow metrics
  pendingPayments: number;
  paymentsUnderReview: number;
  verifiedPayments: number;
  failedPayments: number;
  processingOrders: number;
  completedOrders: number;
  customerCommunications: number;
  botActivity: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  verificationStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  items: never[];
}

interface VerificationQueueItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  verificationStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
}

interface BotStatus {
  id: string;
  name: string;
  role: string;
  status: string;
  enabled: boolean;
  currentJob: string | null;
  lastHeartbeat: string | null;
  executions: number;
  successes: number;
  failures: number;
  latencyMs: number;
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
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customer: { id: string; name: string; email: string } | null;
  } | null;
}

interface TimelineActivity {
  id: string;
  orderId: string;
  eventType: string;
  title: string;
  description: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customer: { name: string } | null;
  } | null;
}

interface DashboardResponse {
  kpis: DashboardKpis;
  hasData: { leads: boolean; orders: boolean; customers: boolean };
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    lead?: { name: string } | null;
    contact?: { firstName: string; lastName: string } | null;
    account?: { name: string } | null;
  }>;
  recentOrders: RecentOrder[];
  botStatuses: BotStatus[];
  verificationQueue: VerificationQueueItem[];
  recentNotifications: AdminNotification[];
  recentTimeline: TimelineActivity[];
}

// ============================ Status color maps ============================
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  verification_required: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
};

const VERIFICATION_STATUS_COLORS: Record<string, string> = {
  unverified: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  account_created: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  checkout_started: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  payment_pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  payment_submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  payment_verification: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  payment_verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  order_processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  order_completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  payment_failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  payment_rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  order_cancelled: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  payment_verification_required: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  payment_verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  payment_failed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  order_completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  bot_error: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  manual_action_required: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

const TIMELINE_ICON: Record<string, typeof History> = {
  order_created: ShoppingCart,
  payment_submitted: Banknote,
  payment_verification_started: AlertTriangle,
  super_admin_notified: Bell,
  whatsapp_sent: MessageCircle,
  email_sent: Mail,
  payment_verified: CheckCircle2,
  order_processing: Loader2,
  order_completed: CheckCircle2,
  payment_failed: XCircle,
  payment_rejected: XCircle,
  status_changed: History,
  note_added: MessageCircle,
  bot_action: BotIcon,
  human_action: Users,
};

function Pill({
  label,
  colorMap,
}: {
  label: string;
  colorMap: Record<string, string>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        colorMap[label] ??
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
      )}
    >
      {label || "—"}
    </span>
  );
}

// ============================ Section ============================
export function DashboardSection() {
  const { data, loading, error } = useDashboardFetch<DashboardResponse>(
    "/api/crm/dashboard"
  );
  const setSection = useDashboard((s) => s.setSection);

  const kpis = data?.kpis;
  const recentOrders = data?.recentOrders ?? [];
  const verificationQueue = data?.verificationQueue ?? [];
  const botStatuses = data?.botStatuses ?? [];
  const recentNotifications = data?.recentNotifications ?? [];
  const recentTimeline = data?.recentTimeline ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        description="Production overview — order lifecycle, payment verifications, bot health, and real-time activity. All metrics computed from live DB queries."
      />

      {error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-300">
          Error loading dashboard: {error}
        </div>
      ) : loading ? (
        <LoadingGrid count={9} />
      ) : (
        <>
          {/* KPIs — 9 production metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            <KpiCard
              label="Total Orders"
              value={kpis?.ordersCount ?? 0}
              icon={ShoppingCart}
              tone="blue"
              noData={(kpis?.ordersCount ?? 0) === 0}
            />
            <KpiCard
              label="Pending Payments"
              value={kpis?.pendingPayments ?? 0}
              icon={Clock}
              tone="amber"
              noData={(kpis?.pendingPayments ?? 0) === 0}
            />
            <KpiCard
              label="Payments Under Review"
              value={kpis?.paymentsUnderReview ?? 0}
              icon={AlertTriangle}
              tone="violet"
              noData={(kpis?.paymentsUnderReview ?? 0) === 0}
            />
            <KpiCard
              label="Verified Payments"
              value={kpis?.verifiedPayments ?? 0}
              icon={CheckCircle2}
              tone="emerald"
              noData={(kpis?.verifiedPayments ?? 0) === 0}
            />
            <KpiCard
              label="Failed Payments"
              value={kpis?.failedPayments ?? 0}
              icon={XCircle}
              tone="rose"
              noData={(kpis?.failedPayments ?? 0) === 0}
            />
            <KpiCard
              label="Processing Orders"
              value={kpis?.processingOrders ?? 0}
              icon={Loader2}
              tone="cyan"
              noData={(kpis?.processingOrders ?? 0) === 0}
            />
            <KpiCard
              label="Completed Orders"
              value={kpis?.completedOrders ?? 0}
              icon={CheckCircle2}
              tone="emerald"
              noData={(kpis?.completedOrders ?? 0) === 0}
            />
            <KpiCard
              label="Customer Communications"
              value={kpis?.customerCommunications ?? 0}
              icon={MessageCircle}
              tone="orange"
              noData={(kpis?.customerCommunications ?? 0) === 0}
            />
            <KpiCard
              label="Bot Activity (24h)"
              value={kpis?.botActivity ?? 0}
              icon={BotIcon}
              tone="violet"
              noData={(kpis?.botActivity ?? 0) === 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent orders */}
            <ChartCard
              title="Recent Orders"
              description="5 most recent orders with full status flags."
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSection("orders")}
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {recentOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No orders yet"
                  description="Orders appear here when customers check out via the storefront."
                  className="my-3"
                />
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MiniAvatar
                          name={o.customer?.name ?? "?"}
                          size={32}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {o.customer?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {o.orderNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatMoney(o.total, "PKR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(o.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Payment verification queue */}
            <ChartCard
              title="Payment Verification Queue"
              description="Orders awaiting admin verification."
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSection("orders")}
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {verificationQueue.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Queue clear"
                  description="No payments are awaiting verification. Nice."
                  className="my-3"
                />
              ) : (
                <div className="space-y-2">
                  {verificationQueue.slice(0, 8).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {o.customer?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {o.orderNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Pill
                          label={o.paymentStatus}
                          colorMap={PAYMENT_STATUS_COLORS}
                        />
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(o.total, "PKR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Bot status grid */}
            <ChartCard
              title="Bot Status"
              description="Real worker framework — live backend state."
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSection("bots")}
                >
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {botStatuses.length === 0 ? (
                <EmptyState
                  icon={BotIcon}
                  title="No bots"
                  description="Register bots under Bots to see real-time status."
                  className="my-3"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {botStatuses.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-lg border p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {b.name}
                        </p>
                        <BotStatusBadge status={b.status} />
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {b.role}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          exec: <span className="tabular-nums">{b.executions}</span>
                        </span>
                        <span>
                          ok:{" "}
                          <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                            {b.successes}
                          </span>
                        </span>
                        <span>
                          fail:{" "}
                          <span className="tabular-nums text-rose-600 dark:text-rose-400">
                            {b.failures}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Recent notifications */}
            <ChartCard
              title="Recent Notifications"
              description="3 most recent unread admin alerts."
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSection("notifications")}
                >
                  All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {recentNotifications.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="No unread notifications"
                  description="You're all caught up."
                  className="my-3"
                />
              ) : (
                <div className="space-y-2">
                  {recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg border p-2.5 space-y-1 bg-amber-50/40 dark:bg-amber-500/[0.04] border-amber-500/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            NOTIFICATION_TYPE_COLORS[n.type] ??
                              "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                          )}
                        >
                          {n.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                      {n.order ? (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {n.order.orderNumber} ·{" "}
                          {n.order.customer?.name ?? "—"}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Real-time activity stream */}
          <ChartCard
            title="Real-time Activity Stream"
            description="Recent order timeline events across all customers — chronological."
          >
            {recentTimeline.length === 0 ? (
              <EmptyState
                icon={History}
                title="No activity yet"
                description="Order timeline events (creation, payments, verifications, communications) will stream here in real time."
                className="my-4"
              />
            ) : (
              <ol className="space-y-2.5">
                {recentTimeline.map((e) => {
                  const Icon = TIMELINE_ICON[e.eventType] ?? History;
                  return (
                    <li
                      key={e.id}
                      className="flex items-start gap-3 border-b pb-2.5 last:border-0 last:pb-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {e.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {timeAgo(e.createdAt)}
                          </span>
                        </div>
                        {e.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {e.description}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          {e.order ? (
                            <span className="font-mono">
                              {e.order.orderNumber}
                              {e.order.customer?.name
                                ? ` · ${e.order.customer.name}`
                                : ""}
                            </span>
                          ) : null}
                          <Badge variant="outline" className="text-[10px]">
                            {e.eventType}
                          </Badge>
                          <span>actor: {e.actor}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
