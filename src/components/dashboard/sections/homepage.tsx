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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Star,
  Image,
  Grid,
  Zap,
  Package,
  MousePointerClick,
  Quote,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  ExternalLink,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";

type BlockType =
  | "hero"
  | "banner"
  | "category"
  | "feature"
  | "product-grid"
  | "cta"
  | "testimonial";

interface HomepageBlock {
  id: string;
  type: BlockType;
  title: string;
  content: Record<string, unknown>;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  kind: "text" | "number" | "list" | "textarea";
}

const BLOCK_TYPES: {
  value: BlockType;
  label: string;
  icon: typeof Star;
  description: string;
  fields: FieldDef[];
}[] = [
  {
    value: "hero",
    label: "Hero",
    icon: Star,
    description: "Headline + CTA at top of page",
    fields: [
      { key: "heading", label: "Heading", placeholder: "Powering digital commerce", kind: "text" },
      { key: "subheading", label: "Subheading", placeholder: "Premium keys, accounts & licenses", kind: "text" },
      { key: "ctaText", label: "CTA Text", placeholder: "Shop now", kind: "text" },
      { key: "ctaHref", label: "CTA Link", placeholder: "/catalog", kind: "text" },
    ],
  },
  {
    value: "banner",
    label: "Banner",
    icon: Image,
    description: "Promotional image banner",
    fields: [
      { key: "image", label: "Image URL", placeholder: "https://…", kind: "text" },
      { key: "href", label: "Link", placeholder: "/promo", kind: "text" },
      { key: "alt", label: "Alt text", placeholder: "Summer sale", kind: "text" },
    ],
  },
  {
    value: "category",
    label: "Category Grid",
    icon: Grid,
    description: "Grid of category cards",
    fields: [
      { key: "title", label: "Title", placeholder: "Shop by category", kind: "text" },
      { key: "categories", label: "Categories (comma-separated)", placeholder: "Gaming, AI Tools, SaaS", kind: "list" },
    ],
  },
  {
    value: "feature",
    label: "Feature",
    icon: Zap,
    description: "Highlight key features",
    fields: [
      { key: "heading", label: "Heading", placeholder: "Why PLAYBEAT PULSE", kind: "text" },
      { key: "items", label: "Items (comma-separated)", placeholder: "Instant delivery, Verified sellers, 24/7 support", kind: "list" },
    ],
  },
  {
    value: "product-grid",
    label: "Product Grid",
    icon: Package,
    description: "Carousel of products",
    fields: [
      { key: "title", label: "Title", placeholder: "Trending now", kind: "text" },
      { key: "limit", label: "Limit", placeholder: "8", kind: "number" },
      { key: "category", label: "Category filter", placeholder: "ai-tools", kind: "text" },
    ],
  },
  {
    value: "cta",
    label: "Call To Action",
    icon: MousePointerClick,
    description: "Single conversion block",
    fields: [
      { key: "heading", label: "Heading", placeholder: "Ready to scale?", kind: "text" },
      { key: "buttonText", label: "Button Text", placeholder: "Get started", kind: "text" },
      { key: "buttonHref", label: "Button Link", placeholder: "/signup", kind: "text" },
    ],
  },
  {
    value: "testimonial",
    label: "Testimonial",
    icon: Quote,
    description: "Customer quote block",
    fields: [
      { key: "quote", label: "Quote", placeholder: "Best digital store hands down.", kind: "textarea" },
      { key: "author", label: "Author", placeholder: "Jane Doe", kind: "text" },
      { key: "role", label: "Role", placeholder: "Founder, XStudio", kind: "text" },
    ],
  },
];

function blockMeta(type: BlockType) {
  return BLOCK_TYPES.find((t) => t.value === type) ?? BLOCK_TYPES[0];
}

function summarizeContent(content: Record<string, unknown> | undefined): string {
  if (!content) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(content)) {
    if (v === undefined || v === null || v === "") continue;
    let sv: string;
    if (Array.isArray(v)) sv = v.join(", ");
    else if (typeof v === "string") sv = v;
    else sv = JSON.stringify(v);
    if (sv.length > 64) sv = sv.slice(0, 64) + "…";
    parts.push(`${k}: ${sv}`);
  }
  return parts.slice(0, 3).join(" · ");
}

function contentToForm(content: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!content) return out;
  for (const [k, v] of Object.entries(content)) {
    if (v === undefined || v === null) out[k] = "";
    else if (Array.isArray(v)) out[k] = v.join(", ");
    else if (typeof v === "object") out[k] = JSON.stringify(v);
    else out[k] = String(v);
  }
  return out;
}

function formToContent(form: Record<string, string>, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = (form[f.key] ?? "").trim();
    if (raw === "") continue;
    if (f.kind === "number") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) out[f.key] = n;
    } else if (f.kind === "list") {
      out[f.key] = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      out[f.key] = raw;
    }
  }
  return out;
}

interface BlockFormProps {
  initial?: HomepageBlock;
  busy: boolean;
  onSubmit: (payload: {
    type: BlockType;
    title: string;
    content: Record<string, unknown>;
    enabled: boolean;
  }) => void;
  onCancel: () => void;
}

function BlockFormDialog({ initial, busy, onSubmit, onCancel }: BlockFormProps) {
  const [type, setType] = useState<BlockType>(initial?.type ?? "hero");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [form, setForm] = useState<Record<string, string>>(() =>
    contentToForm(initial?.content)
  );

  useEffect(() => {
    const sync = () => {
      if (initial) {
        setType(initial.type);
        setTitle(initial.title);
        setEnabled(initial.enabled);
        setForm(contentToForm(initial.content));
      }
    };
    sync();
  }, [initial]);

  const meta = blockMeta(type);

  function setField(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    onSubmit({
      type,
      title: title.trim(),
      content: formToContent(form, meta.fields),
      enabled,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{initial ? "Edit Block" : "Add Block"}</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="block-type">Block Type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as BlockType);
              setForm({});
            }}
            disabled={!!initial}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {BLOCK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="block-title">Title</Label>
          <Input
            id="block-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hero — Main landing"
            autoFocus
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{meta.description}</p>

      <Separator />

      <div className="space-y-3">
        {meta.fields.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
            {f.kind === "textarea" ? (
              <Textarea
                id={`field-${f.key}`}
                value={form[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
              />
            ) : (
              <Input
                id={`field-${f.key}`}
                value={form[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                type={f.kind === "number" ? "number" : "text"}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="block-enabled" className="text-sm font-medium">
            Enabled
          </Label>
          <p className="text-xs text-muted-foreground">
            Disabled blocks are hidden from the live homepage.
          </p>
        </div>
        <Switch id="block-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save Changes" : "Add Block"}
        </Button>
      </div>
    </form>
  );
}

interface BlockCardProps {
  block: HomepageBlock;
  index: number;
  total: number;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BlockCard({
  block,
  index,
  total,
  busy,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: BlockCardProps) {
  const meta = blockMeta(block.type);
  const Icon = meta.icon;
  return (
    <Card
      className={
        "card-shadow transition-opacity " + (block.enabled ? "" : "opacity-60")
      }
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            #{index + 1}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">{block.title}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {meta.label}
            </Badge>
            {!block.enabled && (
              <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-300">
                Hidden
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {summarizeContent(block.content) || "No content configured."}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Updated {timeAgo(block.updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={block.enabled} onCheckedChange={onToggle} disabled={busy} />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {block.enabled ? "On" : "Off"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={busy || index === 0}
              onClick={() => onMove("up")}
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={busy || index === total - 1}
              onClick={() => onMove("down")}
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
              title="Edit block"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
              disabled={busy}
              onClick={onDelete}
              title="Delete block"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomepageSection() {
  const { data: blocks, loading, error } = useDashboardFetch<HomepageBlock[]>("/api/homepage");
  const { triggerRefresh } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<HomepageBlock | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => {
    const list = blocks ?? [];
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [blocks]);

  const stats = useMemo(() => {
    const list = blocks ?? [];
    return {
      total: list.length,
      enabled: list.filter((b) => b.enabled).length,
      hidden: list.filter((b) => !b.enabled).length,
    };
  }, [blocks]);

  async function addBlock(payload: {
    type: BlockType;
    title: string;
    content: Record<string, unknown>;
    enabled: boolean;
  }) {
    setBusy(true);
    try {
      const res = await fetch("/api/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Block added", { description: payload.title });
      setCreateOpen(false);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to add block", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateBlock(
    id: string,
    payload: {
      type: BlockType;
      title: string;
      content: Record<string, unknown>;
      enabled: boolean;
    }
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/homepage/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          content: payload.content,
          enabled: payload.enabled,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Block updated", { description: payload.title });
      setEditing(null);
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to update block", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlock(block: HomepageBlock) {
    setBusyId(block.id);
    setBusy(true);
    try {
      const res = await fetch(`/api/homepage/${block.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success("Block deleted", { description: block.title });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to delete block", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  async function toggleEnabled(block: HomepageBlock, enabled: boolean) {
    setBusyId(block.id);
    try {
      const res = await fetch(`/api/homepage/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      toast.success(enabled ? "Block enabled" : "Block disabled", {
        description: block.title,
      });
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to toggle block", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function moveBlock(block: HomepageBlock, direction: "up" | "down") {
    const idx = sorted.findIndex((b) => b.id === block.id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const neighbor = sorted[swapIdx];
    setBusyId(block.id);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/homepage/${block.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
        }),
        fetch(`/api/homepage/${neighbor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: block.sortOrder }),
        }),
      ]);
      if (!a.ok || !b.ok) throw new Error("Reorder failed");
      toast.success("Order updated");
      triggerRefresh();
    } catch (e) {
      toast.error("Failed to reorder", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Homepage Builder"
        description="Compose the playbeat.digital homepage from modular blocks"
        action={
          <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Block
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <BlockFormDialog
                busy={busy}
                onSubmit={addBlock}
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
            Failed to load blocks: {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total Blocks"
              value={String(stats.total)}
              icon={LayoutTemplate}
              tone="primary"
              footer="Composing the homepage"
            />
            <KpiCard
              label="Enabled"
              value={String(stats.enabled)}
              icon={Eye}
              tone="success"
              footer="Visible on playbeat.digital"
            />
            <KpiCard
              label="Hidden"
              value={String(stats.hidden)}
              icon={LayoutTemplate}
              tone="warning"
              footer="Drafted or paused"
            />
          </div>

          <Card className="card-shadow mb-6 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-3 text-sm">
              <Eye className="h-4 w-4 text-primary" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">Live preview:</span> these
                blocks render top-to-bottom on{" "}
                <a
                  href="https://playbeat.digital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                >
                  playbeat.digital
                  <ExternalLink className="h-3 w-3" />
                </a>{" "}
                in <code className="rounded bg-muted px-1 py-0.5">sortOrder</code>.
              </p>
            </CardContent>
          </Card>

          {sorted.length === 0 ? (
            <Card className="card-shadow">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No homepage blocks yet. Click “Add Block” to start composing.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sorted.map((block, idx) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={idx}
                  total={sorted.length}
                  busy={busyId === block.id}
                  onToggle={(enabled) => toggleEnabled(block, enabled)}
                  onMove={(dir) => moveBlock(block, dir)}
                  onEdit={() => setEditing(block)}
                  onDelete={() => deleteBlock(block)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !busy && !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          {editing && (
            <BlockFormDialog
              initial={editing}
              busy={busy}
              onSubmit={(p) => updateBlock(editing.id, p)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
