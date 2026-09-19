"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ============ Section header ============
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ============ KPI card ============
type Tone =
  | "blue"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "cyan"
  | "orange"
  | "slate";

const TONE_ICON: Record<Tone, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  delta,
  deltaLabel,
  noData,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  delta?: number;
  deltaLabel?: string;
  noData?: boolean;
}) {
  const iconClass = TONE_ICON[tone] ?? TONE_ICON.blue;
  const positiveDelta = typeof delta === "number" && delta >= 0;

  return (
    <Card className="card-shadow">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          {noData ? (
            <p className="text-sm text-muted-foreground/70 italic">No data</p>
          ) : (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          )}
          {typeof delta === "number" && !noData ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  positiveDelta
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {positiveDelta ? "▲" : "▼"} {Math.abs(delta)}%
              </span>
              {deltaLabel ? (
                <span className="text-muted-foreground">{deltaLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              iconClass
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============ Chart card ============
export function ChartCard({
  title,
  description,
  children,
  action,
  noData,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  noData?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("card-shadow", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        {noData ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground/70 italic">
            No data
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ============ Loading skeletons ============
export function LoadingGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="card-shadow">
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <Card className="card-shadow">
      <CardHeader>
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton style={{ height }} className="w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

// ============ Empty state ============
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 py-12 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
