"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============ Lead status meta ============
// Explicit class strings so Tailwind's JIT can statically extract them.
export const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  new: {
    label: "New",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    dot: "bg-blue-500",
  },
  contacted: {
    label: "Contacted",
    className:
      "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    dot: "bg-cyan-500",
  },
  qualified: {
    label: "Qualified",
    className:
      "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    dot: "bg-violet-500",
  },
  proposal: {
    label: "Proposal",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  negotiation: {
    label: "Negotiation",
    className:
      "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    dot: "bg-orange-500",
  },
  won: {
    label: "Won",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "Lost",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
  archived: {
    label: "Archived",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  },
};

// ============ Verification status meta ============
export const VERIFICATION_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  unverified: {
    label: "Unverified",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  verified: {
    label: "Verified",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
};

// ============ Bot status meta ============
export const BOT_STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  online: {
    label: "Online",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  busy: {
    label: "Busy",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    dot: "bg-amber-500",
  },
  idle: {
    label: "Idle",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  },
  error: {
    label: "Error",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    dot: "bg-rose-500",
  },
  disabled: {
    label: "Disabled",
    className:
      "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
    dot: "bg-zinc-500",
  },
};

// ============ Badges ============
function BadgeShell({
  meta,
  status,
  withDot = true,
}: {
  meta: { label: string; className: string; dot: string };
  status: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      {withDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            meta.dot,
            (status === "online" || status === "busy") && "pulse-dot"
          )}
        />
      )}
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status || "Unknown",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  };
  return <BadgeShell meta={meta} status={status} />;
}

export function VerificationBadge({ status }: { status: string }) {
  const meta = VERIFICATION_META[status] ?? {
    label: status || "Unknown",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  };
  return <BadgeShell meta={meta} status={status} />;
}

export function BotStatusBadge({ status }: { status: string }) {
  const meta = BOT_STATUS_META[status] ?? {
    label: status || "Unknown",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-500",
  };
  return <BadgeShell meta={meta} status={status} />;
}

// ============ Mini avatar ============
const AVATAR_PALETTE = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
];

export function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function MiniAvatar({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none",
        colorFor(name || "?")
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
      }}
      aria-label={name || "Avatar"}
      title={name || "Avatar"}
    >
      {initialsOf(name || "?")}
    </span>
  );
}

// ============ Date helpers ============
export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

export function formatDate(
  iso: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", opts).format(d);
}
