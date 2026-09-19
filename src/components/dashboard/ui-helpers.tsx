"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20", dot: "bg-blue-500" },
  contacted: { label: "Contacted", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20", dot: "bg-cyan-500" },
  qualified: { label: "Qualified", className: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200 dark:border-violet-500/20", dot: "bg-violet-500" },
  proposal: { label: "Proposal", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
  negotiation: { label: "Negotiation", className: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 border-orange-200 dark:border-orange-500/20", dot: "bg-orange-500" },
  won: { label: "Won", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
  lost: { label: "Lost", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/20", dot: "bg-rose-500" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium border", meta.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export const SOURCE_META: Record<string, { label: string; emoji: string; color: string }> = {
  website: { label: "Website", emoji: "🌐", color: "text-blue-600" },
  facebook: { label: "Facebook", emoji: "📘", color: "text-blue-700" },
  instagram: { label: "Instagram", emoji: "📸", color: "text-pink-600" },
  whatsapp: { label: "WhatsApp", emoji: "💬", color: "text-emerald-600" },
  referral: { label: "Referral", emoji: "🤝", color: "text-violet-600" },
  ads: { label: "Paid Ads", emoji: "🎯", color: "text-amber-600" },
  organic: { label: "Organic", emoji: "🔍", color: "text-teal-600" },
  api: { label: "API", emoji: "🔌", color: "text-slate-600" },
};

export function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_META[source] ?? { label: source, emoji: "•", color: "" };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : score >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", cls)}>
      {score}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function MiniAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sz,
        colorFor(name)
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}

export const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "✉️",
  meeting: "📅",
  note: "📝",
  status_change: "🔄",
  assigned: "👤",
  message: "💬",
};
