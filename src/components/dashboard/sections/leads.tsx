"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Download, Plus } from "lucide-react";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import type { Lead, Rep } from "@/lib/types";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/types";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { useDashboard } from "@/lib/store";
import { SectionHeader } from "../shared";
import { MiniAvatar, ScoreBadge, SourceBadge, StatusBadge, STATUS_META, timeAgo } from "../ui-helpers";
import { toast } from "sonner";

export function LeadsSection() {
  const { data: leads, loading } = useDashboardFetch<Lead[]>("/api/leads?limit=200");
  const { data: reps } = useDashboardFetch<Rep[]>("/api/reps");
  const { displayCurrency, setSelectedLeadId } = useDashboard();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [repFilter, setRepFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (source !== "all" && l.source !== source) return false;
      if (repFilter !== "all" && l.assignedTo !== repFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company ?? "").toLowerCase().includes(q) ||
          l.phone.includes(q)
        );
      }
      return true;
    });
  }, [leads, status, source, repFilter, search]);

  const totalValueUsd = filtered.reduce(
    (s, l) => s + convert(l.value, l.currency as Currency, "USD"),
    0
  );

  return (
    <div>
      <SectionHeader
        title="Leads"
        description={`${filtered.length} leads · ${formatMoney(convert(totalValueUsd, "USD", displayCurrency), displayCurrency)} pipeline value`}
        action={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="card-shadow mb-4">
        <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, phone…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reps</SelectItem>
                {reps?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => toast.info("Export queued", { description: "CSV will be ready shortly" })}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-shadow overflow-hidden">
        <div className="scroll-thin overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[240px]">Lead</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No leads match your filters.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <MiniAvatar name={lead.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{lead.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{lead.company ?? lead.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><SourceBadge source={lead.source} /></TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(convert(lead.value, lead.currency as Currency, displayCurrency), displayCurrency)}
                  </TableCell>
                  <TableCell className="text-center">
                    <ScoreBadge score={lead.score} />
                  </TableCell>
                  <TableCell>
                    {lead.rep ? (
                      <div className="flex items-center gap-2">
                        <MiniAvatar name={lead.rep.name} size="sm" />
                        <span className="truncate text-xs">{lead.rep.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(lead.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
