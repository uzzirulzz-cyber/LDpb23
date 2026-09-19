"use client";

import { useMemo } from "react";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES } from "@/lib/types";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { useDashboard } from "@/lib/store";
import { SectionHeader } from "../shared";
import { MiniAvatar, ScoreBadge, SourceBadge, STATUS_META } from "../ui-helpers";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";

const PIPELINE_STAGES: LeadStatus[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export function PipelineSection() {
  const { data: leads, loading } = useDashboardFetch<Lead[]>("/api/leads?limit=300");
  const { displayCurrency, setSelectedLeadId, triggerRefresh } = useDashboard();

  const columns = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    for (const s of PIPELINE_STAGES) map.set(s, []);
    for (const l of leads ?? []) {
      if (map.has(l.status as LeadStatus)) map.get(l.status as LeadStatus)!.push(l);
    }
    return map;
  }, [leads]);

  async function moveStage(lead: Lead, newStage: LeadStatus) {
    if (lead.status === newStage) return;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStage }),
    });
    if (res.ok) {
      toast.success("Lead moved", { description: `${lead.name} → ${STATUS_META[newStage].label}` });
      triggerRefresh();
    } else {
      toast.error("Failed to move lead");
    }
  }

  return (
    <div>
      <SectionHeader
        title="Pipeline"
        description="Drag-ready deal stages · click a card to open lead details"
      />

      <div className="scroll-thin -mx-1 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-3 px-1">
          {PIPELINE_STAGES.map((stage) => {
            const items = columns.get(stage) ?? [];
            const totalUsd = items.reduce((s, l) => s + convert(l.value, l.currency as Currency, "USD"), 0);
            const meta = STATUS_META[stage];
            return (
              <div key={stage} className="flex w-72 shrink-0 flex-col">
                {/* Column header */}
                <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 card-shadow">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="text-sm font-semibold">{meta.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {formatMoney(convert(totalUsd, "USD", displayCurrency), displayCurrency)}
                  </span>
                </div>

                {/* Cards */}
                <div className="scroll-thin flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
                  {loading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                    ))}
                  {!loading && items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                  {!loading &&
                    items.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="group cursor-pointer rounded-lg border border-border bg-card p-3 card-shadow transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{lead.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{lead.company ?? lead.email}</p>
                          </div>
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <SourceBadge source={lead.source} />
                          <ScoreBadge score={lead.score} />
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                          <span className="text-xs font-bold tabular-nums text-primary">
                            {formatMoney(convert(lead.value, lead.currency as Currency, displayCurrency), displayCurrency)}
                          </span>
                          {lead.rep && <MiniAvatar name={lead.rep.name} size="sm" />}
                        </div>
                        {/* Quick move buttons */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {PIPELINE_STAGES.filter((s) => s !== stage).slice(0, 4).map((s) => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveStage(lead, s);
                              }}
                              className="rounded px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {STATUS_META[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
