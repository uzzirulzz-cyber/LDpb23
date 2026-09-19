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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Loader2,
  Users,
  Building2,
  Globe,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { SectionHeader } from "../shared";
import {
  MiniAvatar,
  SourceBadge,
  timeAgo,
} from "./ui-helpers";
import { toast } from "sonner";

interface Contact {
  id: string;
  accountId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  country: string | null;
  source: string | null;
  tags: string | null;
  account: { id: string; name: string; industry: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  currency: string;
  size: number | null;
  ownerRepId: string | null;
  _count: { contacts: number; quotes: number; invoices: number };
  createdAt: string;
  updatedAt: string;
}

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  accountId: string;
  country: string;
}

const EMPTY_CONTACT: ContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  accountId: "none",
  country: "",
};

interface AccountForm {
  name: string;
  website: string;
  industry: string;
  country: string;
  currency: string;
  size: string;
}

const EMPTY_ACCOUNT: AccountForm = {
  name: "",
  website: "",
  industry: "",
  country: "",
  currency: "USD",
  size: "",
};

export function ContactsSection() {
  const displayCurrency = useDashboard((s) => s.displayCurrency) as Currency;
  const triggerRefresh = useDashboard((s) => s.triggerRefresh);

  const {
    data: contacts,
    loading: contactsLoading,
    error: contactsError,
  } = useDashboardFetch<Contact[]>("/api/contacts");
  const {
    data: accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useDashboardFetch<Account[]>("/api/accounts");

  const [contactSearch, setContactSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");

  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);

  const [accountOpen, setAccountOpen] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(EMPTY_ACCOUNT);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.title ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q) ||
        (c.account?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, contactSearch]);

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!accountSearch.trim()) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.industry ?? "").toLowerCase().includes(q) ||
        (a.country ?? "").toLowerCase().includes(q) ||
        (a.website ?? "").toLowerCase().includes(q)
    );
  }, [accounts, accountSearch]);

  const handleCreateContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.email.trim()) {
      toast.error("First name and email are required");
      return;
    }
    setContactSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim() || null,
        title: contactForm.title.trim() || null,
        country: contactForm.country.trim() || null,
        accountId:
          contactForm.accountId && contactForm.accountId !== "none"
            ? contactForm.accountId
            : null,
      };
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Contact created", {
        description: `${contactForm.firstName.trim()} ${contactForm.lastName.trim()} added.`,
      });
      setContactForm(EMPTY_CONTACT);
      setContactOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create contact", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    setAccountSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: accountForm.name.trim(),
        website: accountForm.website.trim() || null,
        industry: accountForm.industry.trim() || null,
        country: accountForm.country.trim() || null,
        currency: accountForm.currency,
        size: accountForm.size ? Number(accountForm.size) : null,
      };
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Request failed: ${res.status}`);
      }
      toast.success("Account created", {
        description: `${accountForm.name.trim()} added to accounts.`,
      });
      setAccountForm(EMPTY_ACCOUNT);
      setAccountOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create account", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setAccountSubmitting(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Contacts & Accounts"
        description={`Manage relationships — ${contacts?.length ?? 0} contacts across ${
          accounts?.length ?? 0
        } accounts · viewing in ${displayCurrency}`}
      />

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Accounts
          </TabsTrigger>
        </TabsList>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts" className="space-y-4">
          <Card className="card-shadow">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts by name, email, account…"
                  className="h-9 pl-9"
                />
              </div>
              <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Contact</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="c-firstName">First name *</Label>
                        <Input
                          id="c-firstName"
                          value={contactForm.firstName}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              firstName: e.target.value,
                            })
                          }
                          placeholder="Hira"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="c-lastName">Last name</Label>
                        <Input
                          id="c-lastName"
                          value={contactForm.lastName}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              lastName: e.target.value,
                            })
                          }
                          placeholder="Sheikh"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="c-email">Email *</Label>
                        <Input
                          id="c-email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="hira@playbeat.digital"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="c-phone">Phone</Label>
                        <Input
                          id="c-phone"
                          value={contactForm.phone}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              phone: e.target.value,
                            })
                          }
                          placeholder="+92 300 1234567"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="c-title">Title</Label>
                        <Input
                          id="c-title"
                          value={contactForm.title}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              title: e.target.value,
                            })
                          }
                          placeholder="Procurement Lead"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="c-country">Country</Label>
                        <Input
                          id="c-country"
                          value={contactForm.country}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              country: e.target.value,
                            })
                          }
                          placeholder="Pakistan"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Account</Label>
                      <Select
                        value={contactForm.accountId}
                        onValueChange={(v) =>
                          setContactForm({ ...contactForm, accountId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {accounts?.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setContactOpen(false)}
                        disabled={contactSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateContact}
                        disabled={contactSubmitting}
                        className="gap-1.5"
                      >
                        {contactSubmitting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Add Contact
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {contactsError && (
            <Card className="border-rose-200">
              <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400">
                Failed to load contacts: {contactsError}
              </CardContent>
            </Card>
          )}

          <Card className="card-shadow overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[220px]">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactsLoading &&
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!contactsLoading && filteredContacts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        No contacts found.
                      </TableCell>
                    </TableRow>
                  )}
                  {!contactsLoading &&
                    filteredContacts.map((c) => {
                      const fullName = `${c.firstName} ${c.lastName}`.trim();
                      return (
                        <TableRow
                          key={c.id}
                          className="transition-colors hover:bg-muted/40"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <MiniAvatar name={fullName} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {fullName}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {c.title ?? "—"}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              {c.email}
                            </a>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {c.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.title ?? "—"}
                          </TableCell>
                          <TableCell>
                            {c.account ? (
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate">{c.account.name}</span>
                              </span>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
                                No account
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.country ?? "—"}
                          </TableCell>
                          <TableCell>
                            {c.source ? (
                              <SourceBadge source={c.source} />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {timeAgo(c.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          <Card className="card-shadow">
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder="Search accounts by name, industry, country…"
                  className="h-9 pl-9"
                />
              </div>
              <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Account</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="a-name">Account name *</Label>
                      <Input
                        id="a-name"
                        value={accountForm.name}
                        onChange={(e) =>
                          setAccountForm({ ...accountForm, name: e.target.value })
                        }
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="a-website">Website</Label>
                        <Input
                          id="a-website"
                          value={accountForm.website}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              website: e.target.value,
                            })
                          }
                          placeholder="acme.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="a-industry">Industry</Label>
                        <Input
                          id="a-industry"
                          value={accountForm.industry}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              industry: e.target.value,
                            })
                          }
                          placeholder="Retail"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="a-country">Country</Label>
                        <Input
                          id="a-country"
                          value={accountForm.country}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              country: e.target.value,
                            })
                          }
                          placeholder="United Arab Emirates"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="a-size">Company size</Label>
                        <Input
                          id="a-size"
                          type="number"
                          value={accountForm.size}
                          onChange={(e) =>
                            setAccountForm({
                              ...accountForm,
                              size: e.target.value,
                            })
                          }
                          placeholder="50"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Currency</Label>
                      <Select
                        value={accountForm.currency}
                        onValueChange={(v) =>
                          setAccountForm({ ...accountForm, currency: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setAccountOpen(false)}
                        disabled={accountSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateAccount}
                        disabled={accountSubmitting}
                        className="gap-1.5"
                      >
                        {accountSubmitting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Add Account
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {accountsError && (
            <Card className="border-rose-200">
              <CardContent className="p-4 text-sm text-rose-600 dark:text-rose-400">
                Failed to load accounts: {accountsError}
              </CardContent>
            </Card>
          )}

          {accountsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="card-shadow">
                  <CardContent className="space-y-3 p-5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Separator />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No accounts found. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((a) => (
                <Card
                  key={a.id}
                  className="card-shadow transition-shadow hover:shadow-md"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {a.name}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {a.country ?? "Unknown region"}
                          </div>
                        </div>
                      </div>
                      {a.industry && (
                        <Badge
                          variant="outline"
                          className="shrink-0 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          {a.industry}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {a.website && (
                        <a
                          href={
                            a.website.startsWith("http")
                              ? a.website
                              : `https://${a.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {a.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {a.size !== null && (
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          {a.size} employees
                        </span>
                      )}
                      {a.currency && (
                        <Badge variant="secondary" className="font-mono">
                          {a.currency}
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="flex items-center justify-center text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-1 text-base font-bold tabular-nums">
                          {a._count.contacts}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Contacts
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="flex items-center justify-center text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-1 text-base font-bold tabular-nums">
                          {a._count.quotes}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Quotes
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                        <div className="flex items-center justify-center text-muted-foreground">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-1 text-base font-bold tabular-nums">
                          {a._count.invoices}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Invoices
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-muted-foreground">
                      Added {timeAgo(a.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
