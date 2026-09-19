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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Receipt,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { timeAgo } from "../ui-helpers";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { convert, formatMoney, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LineItem = { name: string; qty: number; price: number };

type Quote = {
  id: string;
  number: string;
  accountId: string | null;
  contactId: string | null;
  subject: string;
  status: string;
  currency: string;
  total: number;
  items: LineItem[];
  validUntil: string | null;
  account: { name: string } | null;
  createdAt: string;
};

type Invoice = {
  id: string;
  number: string;
  accountId: string | null;
  contactId: string | null;
  orderId: string | null;
  subject: string;
  status: string;
  currency: string;
  total: number;
  items: LineItem[];
  dueDate: string | null;
  paidAt: string | null;
  account: { name: string } | null;
  createdAt: string;
};

type Account = { id: string; name: string };

/* ------------------------------------------------------------------ */
/* Status meta                                                        */
/* ------------------------------------------------------------------ */

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  accepted: { label: "Accepted", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  expired: { label: "Expired", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  overdue: { label: "Overdue", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
};

function StatusPill({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) {
  const m = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-xs font-semibold capitalize", m.cls)}>
      {m.label}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Line item editor                                                   */
/* ------------------------------------------------------------------ */

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const total = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const update = (idx: number, patch: Partial<LineItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { name: "", qty: 1, price: 0 }]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_70px_100px_28px] items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Item</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Price</span>
        <span />
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">No line items yet.</p>
        )}
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_70px_100px_28px] items-center gap-2">
            <Input
              value={it.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              placeholder="Item name"
              className="h-8"
            />
            <Input
              type="number"
              min={0}
              value={it.qty}
              onChange={(e) => update(idx, { qty: Number(e.target.value) })}
              className="h-8 text-center"
            />
            <Input
              type="number"
              min={0}
              value={it.price}
              onChange={(e) => update(idx, { price: Number(e.target.value) })}
              className="h-8 text-right"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-rose-600"
              onClick={() => remove(idx)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add line
        </Button>
        <div className="text-sm font-semibold tabular-nums">
          Total: <span className="ml-1 text-primary">{new Intl.NumberFormat("en-US").format(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* New Quote dialog                                                   */
/* ------------------------------------------------------------------ */

function NewQuoteDialog({ accounts }: { accounts: Account[] }) {
  const { triggerRefresh, displayCurrency } = useDashboard();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [accountId, setAccountId] = useState<string>("none");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [items, setItems] = useState<LineItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSubject("");
    setAccountId("none");
    setCurrency("USD");
    setItems([{ name: "", qty: 1, price: 0 }]);
  };

  const submit = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          accountId: accountId === "none" ? null : accountId,
          currency,
          items: items.filter((i) => i.name.trim()),
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Quote created", { description: subject.trim() });
      reset();
      setOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create quote", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> New Quote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-subject">Subject</Label>
            <Input
              id="q-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quote subject"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Line items</Label>
            <LineItemsEditor items={items} onChange={setItems} />
          </div>
          <p className="text-xs text-muted-foreground">
            Display currency is {displayCurrency}. Totals in tables are converted on the fly.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Quote
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* New Invoice dialog                                                 */
/* ------------------------------------------------------------------ */

function NewInvoiceDialog({ accounts }: { accounts: Account[] }) {
  const { triggerRefresh } = useDashboard();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [accountId, setAccountId] = useState<string>("none");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [items, setItems] = useState<LineItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSubject("");
    setAccountId("none");
    setCurrency("USD");
    setItems([{ name: "", qty: 1, price: 0 }]);
  };

  const submit = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          accountId: accountId === "none" ? null : accountId,
          currency,
          items: items.filter((i) => i.name.trim()),
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Invoice created", { description: subject.trim() });
      reset();
      setOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create invoice", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> New Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-subject">Subject</Label>
            <Input
              id="inv-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Invoice subject"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="PKR">PKR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Line items</Label>
            <LineItemsEditor items={items} onChange={setItems} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Main section                                                       */
/* ------------------------------------------------------------------ */

export function QuotesSection() {
  const { displayCurrency, triggerRefresh } = useDashboard();
  const { data: quotes, loading: qLoading, error: qErr } = useDashboardFetch<Quote[]>("/api/quotes");
  const { data: invoices, loading: iLoading, error: iErr } = useDashboardFetch<Invoice[]>("/api/invoices");
  const { data: accounts } = useDashboardFetch<Account[]>("/api/accounts");

  const [qStatus, setQStatus] = useState<string>("all");
  const [iStatus, setIStatus] = useState<string>("all");

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    return qStatus === "all" ? quotes : quotes.filter((q) => q.status === qStatus);
  }, [quotes, qStatus]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return iStatus === "all" ? invoices : invoices.filter((i) => i.status === iStatus);
  }, [invoices, iStatus]);

  const totalQuotes = useMemo(
    () => (quotes ?? []).reduce((s, q) => s + convert(q.total, q.currency as Currency, displayCurrency), 0),
    [quotes, displayCurrency]
  );
  const totalInvoices = useMemo(
    () => (invoices ?? []).reduce((s, i) => s + convert(i.total, i.currency as Currency, displayCurrency), 0),
    [invoices, displayCurrency]
  );
  const paidInvoices = useMemo(
    () => (invoices ?? []).filter((i) => i.status === "paid").length,
    [invoices]
  );

  const markPaid = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Invoice marked as paid", { description: inv.number });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to mark paid", { description: e instanceof Error ? e.message : "Unknown error" });
    }
  };

  const deleteInvoice = async (inv: Invoice) => {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Invoice deleted", { description: inv.number });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete invoice", { description: e instanceof Error ? e.message : "Unknown error" });
    }
  };

  const deleteQuote = async (q: Quote) => {
    try {
      const res = await fetch(`/api/quotes/${q.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Quote deleted", { description: q.number });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete quote", { description: e instanceof Error ? e.message : "Unknown error" });
    }
  };

  return (
    <div>
      <SectionHeader
        title="Quotes & Invoices"
        description="Track proposals, billing, and payments across all accounts."
      />

      {/* KPIs */}
      {qLoading || iLoading ? (
        <LoadingGrid count={4} />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Quotes" value={String(quotes?.length ?? 0)} icon={FileText} footer={`${formatMoney(totalQuotes, displayCurrency)} pipeline`} />
          <KpiCard label="Total Invoices" value={String(invoices?.length ?? 0)} icon={Receipt} footer={`${formatMoney(totalInvoices, displayCurrency)} billed`} />
          <KpiCard label="Paid Invoices" value={String(paidInvoices)} icon={CheckCircle2} tone="success" footer={`${invoices?.length ? Math.round((paidInvoices / invoices.length) * 100) : 0}% collected`} />
          <KpiCard label="Outstanding" value={String((invoices ?? []).filter((i) => i.status === "sent" || i.status === "overdue").length)} icon={AlertCircle} tone="warning" footer="Awaiting payment" />
        </div>
      )}

      <Tabs defaultValue="quotes" className="gap-4">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Quotes ({quotes?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Invoices ({invoices?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ---------------- QUOTES TAB ---------------- */}
        <TabsContent value="quotes" className="space-y-4">
          <Card className="card-shadow">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Select value={qStatus} onValueChange={setQStatus}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(QUOTE_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NewQuoteDialog accounts={accounts ?? []} />
            </CardContent>
          </Card>

          <Card className="card-shadow overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[110px]">Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qLoading && Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!qLoading && qErr && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-rose-600">
                        Failed to load quotes: {qErr}
                      </TableCell>
                    </TableRow>
                  )}
                  {!qLoading && !qErr && filteredQuotes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        No quotes found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {!qLoading && !qErr && filteredQuotes.map((q) => (
                    <TableRow key={q.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold">{q.number}</TableCell>
                      <TableCell className="max-w-[260px] truncate font-medium">{q.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.account?.name ?? "—"}</TableCell>
                      <TableCell><StatusPill map={QUOTE_STATUS} status={q.status} /></TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(convert(q.total, q.currency as Currency, displayCurrency), displayCurrency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(q.validUntil)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                          onClick={() => deleteQuote(q)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- INVOICES TAB ---------------- */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="card-shadow">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <Select value={iStatus} onValueChange={setIStatus}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(INVOICE_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NewInvoiceDialog accounts={accounts ?? []} />
            </CardContent>
          </Card>

          <Card className="card-shadow overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[120px]">Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {iLoading && Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <div className="h-5 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!iLoading && iErr && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-rose-600">
                        Failed to load invoices: {iErr}
                      </TableCell>
                    </TableRow>
                  )}
                  {!iLoading && !iErr && filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        No invoices found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {!iLoading && !iErr && filteredInvoices.map((inv) => (
                    <TableRow key={inv.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold">{inv.number}</TableCell>
                      <TableCell className="max-w-[240px] truncate font-medium">{inv.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.account?.name ?? "—"}</TableCell>
                      <TableCell><StatusPill map={INVOICE_STATUS} status={inv.status} /></TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(convert(inv.total, inv.currency as Currency, displayCurrency), displayCurrency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.paidAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {inv.status !== "paid" && inv.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                              onClick={() => markPaid(inv)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                            onClick={() => deleteInvoice(inv)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
