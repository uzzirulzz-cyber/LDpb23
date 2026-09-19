"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHeader, KpiCard, LoadingGrid } from "../shared";
import { useDashboardFetch } from "@/hooks/use-dashboard-fetch";
import { useDashboard } from "@/lib/store";
import { timeAgo } from "../ui-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCode,
  Globe,
  Eye,
  Edit,
  Trash2,
  Plus,
  LayoutTemplate,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  status: "published" | "draft";
  content: { hero?: string; body?: string; [k: string]: unknown };
  createdAt: string;
  updatedAt: string;
}

interface PagePayload {
  slug: string;
  title: string;
  status: string;
  content: { body: string };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Published
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Draft
    </Badge>
  );
}

interface PageFormProps {
  initial?: CmsPage;
  busy: boolean;
  onSubmit: (payload: PagePayload) => void;
  onCancel: () => void;
}

function PageFormDialog({ initial, busy, onSubmit, onCancel }: PageFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "draft");
  const [body, setBody] = useState<string>(
    typeof initial?.content?.body === "string"
      ? initial.content.body
      : typeof initial?.content === "string"
        ? (initial.content as string)
        : ""
  );
  const [slugTouched, setSlugTouched] = useState(!!initial);

  useEffect(() => {
    const syncSlug = () => {
      if (!slugTouched) setSlug(slugify(title));
    };
    syncSlug();
  }, [title, slugTouched]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    onSubmit({
      slug: slugify(slug),
      title: title.trim(),
      status: status === "published" ? "published" : "draft",
      content: { body: body.trim() },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Page" : "New Page"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="page-title">Title</Label>
        <Input
          id="page-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="About PLAYBEAT PULSE"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="page-slug">Slug</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="about"
              className="font-mono text-sm"
              disabled={!!initial}
            />
          </div>
          {initial && (
            <p className="text-xs text-muted-foreground">Slug is locked after creation.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="page-body">Page Body</Label>
        <Textarea
          id="page-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the page content…"
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Stored as <code className="rounded bg-muted px-1 py-0.5">content.body</code>. Live at
          playbeat.digital/{slug || "slug"}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save Changes" : "Create Page"}
        </Button>
      </div>
    </form>
  );
}

export function CmsSection() {
  const { data: pages, loading, error } = useDashboardFetch<CmsPage[]>("/api/cms");
  const { triggerRefresh } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const kpis = useMemo(() => {
    const list = pages ?? [];
    return {
      total: list.length,
      published: list.filter((p) => p.status === "published").length,
      drafts: list.filter((p) => p.status === "draft").length,
    };
  }, [pages]);

  async function createPage(payload: PagePayload) {
    setBusy(true);
    try {
      const res = await fetch("/api/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Page created", {
        description: `/${payload.slug} · ${payload.status}`,
      });
      setCreateOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to create page", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function updatePage(id: string, payload: PagePayload) {
    setBusy(true);
    try {
      const res = await fetch(`/api/cms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          status: payload.status,
          content: payload.content,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Page updated", { description: payload.title });
      setEditing(null);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to update page", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(page: CmsPage) {
    setDeletingId(page.id);
    setBusy(true);
    try {
      const res = await fetch(`/api/cms/${page.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Page deleted", { description: page.title });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete page", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
      setDeletingId(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Website Builder — CMS"
        description="Author and publish public-facing pages on playbeat.digital"
        action={
          <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <PageFormDialog
                busy={busy}
                onSubmit={createPage}
                onCancel={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {loading && <LoadingGrid count={3} />}

      {error && !loading && (
        <Card className="card-shadow">
          <CardContent className="py-10 text-center text-sm text-rose-600 dark:text-rose-400">
            Failed to load pages: {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total Pages"
              value={String(kpis.total)}
              icon={LayoutTemplate}
              tone="primary"
              footer="Across playbeat.digital"
            />
            <KpiCard
              label="Published"
              value={String(kpis.published)}
              icon={Globe}
              tone="success"
              footer="Live to public"
            />
            <KpiCard
              label="Drafts"
              value={String(kpis.drafts)}
              icon={FileCode}
              tone="warning"
              footer="Pending review"
            />
          </div>

          <Card className="card-shadow overflow-hidden">
            <div className="scroll-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[240px]">Title</TableHead>
                    <TableHead className="min-w-[180px]">Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        No pages yet. Click “New Page” to create your first.
                      </TableCell>
                    </TableRow>
                  )}
                  {pages?.map((page) => (
                    <TableRow key={page.id} className="transition-colors hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileCode className="h-4 w-4" />
                          </div>
                          <span className="truncate text-sm font-semibold">{page.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`https://playbeat.digital/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                          title="Open live page"
                        >
                          <span className="text-muted-foreground">/</span>
                          {page.slug}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={page.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {timeAgo(page.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditing(page)}
                            title="Edit page"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                            title="View live page"
                          >
                            <a
                              href={`https://playbeat.digital/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                            disabled={busy && deletingId === page.id}
                            onClick={() => deletePage(page)}
                            title="Delete page"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !busy && !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          {editing && (
            <PageFormDialog
              initial={editing}
              busy={busy}
              onSubmit={(p) => updatePage(editing.id, p)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
