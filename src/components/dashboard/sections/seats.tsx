"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Armchair,
  UserPlus,
  UserX,
  Loader2,
  Crown,
  Users,
  CheckCircle2,
  Plus,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { MiniAvatar, timeAgo } from "../ui-helpers";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */

type Rep = {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string;
  target: number;
};

type Seat = {
  id: string;
  label: string;
  repId: string | null;
  rep: Rep | null;
  status: string;
  role: string;
  lastActiveAt: string | null;
  createdAt: string;
};

const SEAT_STATUSES: { value: string; label: string; dot: string; ring: string; text: string }[] = [
  { value: "active", label: "Active", dot: "bg-emerald-500", ring: "ring-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  { value: "idle", label: "Idle", dot: "bg-amber-500", ring: "ring-amber-500/30", text: "text-amber-600 dark:text-amber-400" },
  { value: "offline", label: "Offline", dot: "bg-slate-400", ring: "ring-slate-400/30", text: "text-slate-500 dark:text-slate-400" },
];

function seatStatusMeta(s: string) {
  return SEAT_STATUSES.find((x) => x.value === s) ?? SEAT_STATUSES[2];
}

const MAX_SEATS = 4;

/* ------------------------------------------------------------------ */
/* Seat card                                                          */
/* ------------------------------------------------------------------ */

function SeatCard({ seat, reps }: { seat: Seat; reps: Rep[] }) {
  const { triggerRefresh } = useDashboard();
  const [busy, setBusy] = useState<"rep" | "status" | "release" | null>(null);

  const meta = seatStatusMeta(seat.status);

  const patch = async (body: Record<string, unknown>, kind: "rep" | "status" | "release", okMsg: string) => {
    setBusy(kind);
    try {
      const res = await fetch(`/api/seats/${seat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(okMsg, { description: seat.label });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to update seat", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(null);
    }
  };

  const onRepChange = (v: string) => {
    if (v === "none") {
      patch({ repId: "" }, "rep", "Seat unassigned");
    } else {
      patch({ repId: v, status: seat.status === "offline" ? "idle" : seat.status }, "rep", "Rep assigned to seat");
    }
  };

  const onStatusChange = (v: string) => patch({ status: v }, "status", `Seat marked ${v}`);

  const release = () => patch({ repId: "" }, "release", "Seat released");

  return (
    <Card
      className={cn(
        "card-shadow relative flex flex-col gap-4 overflow-hidden p-5 ring-1 ring-inset transition-all",
        meta.ring,
        seat.status === "active" && "ring-2"
      )}
    >
      {/* Top: label + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">{seat.label}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{seat.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {seat.status === "active" ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
          )}
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", meta.text)}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Rep block */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-5 text-center">
        {seat.rep ? (
          <>
            <MiniAvatar name={seat.rep.name} size="lg" />
            <div>
              <div className="text-sm font-semibold">{seat.rep.name}</div>
              <div className="text-xs capitalize text-muted-foreground">{seat.rep.role}</div>
              <div className="text-[11px] text-muted-foreground">{seat.rep.email}</div>
            </div>
            {seat.rep.region && (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                {seat.rep.region}
              </Badge>
            )}
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed text-muted-foreground">
              <UserX className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-muted-foreground">Unassigned</div>
            <div className="text-[11px] text-muted-foreground">No rep on this seat</div>
          </>
        )}
      </div>

      {/* Last active */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {seat.lastActiveAt ? `Last active ${timeAgo(seat.lastActiveAt)}` : "Never active"}
        </span>
        {seat.rep && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-rose-600"
            onClick={release}
            disabled={busy === "release"}
          >
            {busy === "release" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
            Release
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assigned Rep</Label>
          <Select value={seat.repId ?? "none"} onValueChange={onRepChange} disabled={busy !== null}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Assign rep" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select value={seat.status} onValueChange={onStatusChange} disabled={busy !== null}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEAT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Empty seat slot                                                    */
/* ------------------------------------------------------------------ */

function EmptySeatSlot({ index, onAdd, adding }: { index: number; onAdd: () => void; adding: boolean }) {
  return (
    <Card className="card-shadow relative flex flex-col items-center justify-center gap-3 border-dashed p-5 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Armchair className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-muted-foreground">Seat {index}</div>
        <div className="text-[11px] text-muted-foreground">Not yet provisioned</div>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd} disabled={adding}>
        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Add Seat
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

export function SeatsSection() {
  const { data: seats, loading, error } = useDashboardFetch<Seat[]>("/api/seats");
  const { data: reps } = useDashboardFetch<Rep[]>("/api/reps");
  const { triggerRefresh } = useDashboard();
  const [adding, setAdding] = useState(false);

  const seatList = seats ?? [];
  const activeCount = seatList.filter((s) => s.status === "active").length;
  const assignedCount = seatList.filter((s) => s.repId !== null).length;
  const missingSlots = Math.max(0, MAX_SEATS - seatList.length);
  const fillPct = (seatList.length / MAX_SEATS) * 100;
  const activePct = (activeCount / MAX_SEATS) * 100;

  const addSeat = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/seats", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Seat added", { description: `Provisioned seat ${seatList.length + 1}` });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to add seat", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="4-Seat Capacity"
        description="Your plan supports up to 4 concurrent sales seats. Assign reps and track activity."
      />

      {/* Plan banner */}
      <Card className="card-shadow mb-6 overflow-hidden border-primary/20">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold">PLAYBEAT PULSE — 4-Seat Plan</div>
              <div className="text-xs text-muted-foreground">
                Up to {MAX_SEATS} concurrent seats · {seatList.length} provisioned · {activeCount} active right now
              </div>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="flex-1 sm:max-w-md">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                Capacity {seatList.length} / {MAX_SEATS}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {activeCount} / {MAX_SEATS} active
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary/30 transition-all"
                style={{ width: `${fillPct}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${activePct}%` }}
              />
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
              {Array.from({ length: MAX_SEATS }).map((_, i) => (
                <span key={i} className="text-center">
                  Seat {i + 1}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {loading ? (
        <LoadingGrid count={4} />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Provisioned" value={`${seatList.length} / ${MAX_SEATS}`} icon={Armchair} tone="primary" />
          <KpiCard label="Active Now" value={String(activeCount)} icon={Activity} tone="success" />
          <KpiCard label="Assigned" value={String(assignedCount)} icon={Users} />
          <KpiCard label="Open Slots" value={String(missingSlots)} icon={UserPlus} tone={missingSlots > 0 ? "warning" : "default"} footer={missingSlots > 0 ? "Add a seat to fill" : "Plan full"} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: MAX_SEATS }).map((_, i) => (
            <Card key={i} className="card-shadow">
              <CardContent className="space-y-3 p-5">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
                <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-8 w-full animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600">
            Failed to load seats: {error}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {seatList.map((seat) => (
            <SeatCard key={seat.id} seat={seat} reps={reps ?? []} />
          ))}
          {Array.from({ length: missingSlots }).map((_, i) => (
            <EmptySeatSlot
              key={`empty-${i}`}
              index={seatList.length + i + 1}
              onAdd={addSeat}
              adding={adding}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        The PLAYBEAT PULSE plan supports up to <span className="font-semibold text-foreground">4 concurrent seats</span>.
        {missingSlots > 0 && " Provision remaining seats to scale your team."}
      </p>
    </div>
  );
}
