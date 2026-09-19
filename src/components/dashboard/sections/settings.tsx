"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHeader } from "../shared";
import { useDashboard } from "@/lib/store";
import { CURRENCIES, CURRENCY_SYMBOL, FX_RATES, type Currency } from "@/lib/currency";
import { META_PIXEL_ID, trackLead } from "@/lib/pixel";
import { toast } from "sonner";
import {
  Facebook,
  MessageCircle,
  Smartphone,
  Mail,
  Check,
  Copy,
  Zap,
  ShieldCheck,
  Globe,
  Webhook,
} from "lucide-react";

export function SettingsSection() {
  const { displayCurrency, setDisplayCurrency } = useDashboard();
  const [pixelId, setPixelId] = useState(META_PIXEL_ID);
  const [capiEnabled, setCapiEnabled] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [channels, setChannels] = useState({ meta: true, whatsapp: true, sms: false, email: true });

  function copyPixelId() {
    navigator.clipboard.writeText(pixelId);
    toast.success("Pixel ID copied");
  }

  function fireTestEvent() {
    trackLead(1500, displayCurrency, "test@playbeat.io", "+923001234567");
    toast.success("Test Lead event fired", {
      description: "PageView + Lead sent via client pixel + CAPI bridge",
    });
  }

  return (
    <div>
      <SectionHeader title="Settings" description="Tracking, communication channels & regional preferences" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Meta Pixel */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Facebook className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Meta Pixel</CardTitle>
                  <CardDescription className="text-xs">Browser-side tracking</CardDescription>
                </div>
              </div>
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot" /> Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Pixel ID</Label>
              <div className="mt-1 flex gap-2">
                <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyPixelId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-xs font-semibold">Conversions API (CAPI)</p>
                <p className="text-[10px] text-muted-foreground">Server-side dedup with browser pixel</p>
              </div>
              <Switch checked={capiEnabled} onCheckedChange={setCapiEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-xs font-semibold">Auto-assign leads</p>
                <p className="text-[10px] text-muted-foreground">Round-robin to available reps</p>
              </div>
              <Switch checked={autoAssign} onCheckedChange={setAutoAssign} />
            </div>
            <Button className="w-full gap-1.5" onClick={fireTestEvent}>
              <Zap className="h-4 w-4" /> Fire Test Lead Event
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Events tracked: <code className="rounded bg-muted px-1">PageView</code>,{" "}
              <code className="rounded bg-muted px-1">Lead</code>,{" "}
              <code className="rounded bg-muted px-1">Purchase</code> (on deal won).
            </p>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm">Multi-Currency</CardTitle>
                <CardDescription className="text-xs">Display & FX rates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Display currency</Label>
              <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CURRENCY_SYMBOL[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {CURRENCIES.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">{CURRENCY_SYMBOL[c]}</span>
                    <span className="text-sm font-semibold">{c}</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold tabular-nums">1 USD = {FX_RATES[c]} {c}</p>
                    <p className="text-muted-foreground">{c === "USD" ? "Base currency" : "FX rate"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Communication channels */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <MessageCircle className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm">Communication Channels</CardTitle>
                <CardDescription className="text-xs">Unified inbox sources</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <ChannelRow icon={Facebook} label="Meta Messenger" desc="Facebook & Instagram DMs" enabled={channels.meta} onToggle={(v) => setChannels((c) => ({ ...c, meta: v }))} color="text-blue-600" />
            <ChannelRow icon={MessageCircle} label="WhatsApp Business" desc="WhatsApp Cloud API" enabled={channels.whatsapp} onToggle={(v) => setChannels((c) => ({ ...c, whatsapp: v }))} color="text-emerald-600" />
            <ChannelRow icon={Smartphone} label="SMS" desc="Twilio Programmable SMS" enabled={channels.sms} onToggle={(v) => setChannels((c) => ({ ...c, sms: v }))} color="text-violet-600" />
            <ChannelRow icon={Mail} label="Email" desc="SMTP / SendGrid relay" enabled={channels.email} onToggle={(v) => setChannels((c) => ({ ...c, email: v }))} color="text-amber-600" />
          </CardContent>
        </Card>

        {/* Webhooks & security */}
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Webhook className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-sm">Webhooks & Security</CardTitle>
                <CardDescription className="text-xs">Inbound integrations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Lead webhook endpoint</Label>
              <Input readOnly value="/api/webhook/leads" className="mt-1 font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">Meta webhook verify token</Label>
              <Input type="password" defaultValue="playbeat_verify_2024" className="mt-1 font-mono text-xs" />
            </div>
            <Separator />
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                All tracking is GDPR-aligned. PII is hashed (SHA-256) before reaching Meta.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration summary footer */}
      <Card className="card-shadow mt-4">
        <CardContent className="flex flex-col items-center justify-between gap-3 p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">PLAYBEAT PULSE is fully configured</p>
              <p className="text-xs text-muted-foreground">Meta Pixel · CAPI · Multi-currency · Unified inbox · Webhooks</p>
            </div>
          </div>
          <Button onClick={() => toast.success("Settings saved")}>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelRow({
  icon: Icon,
  label,
  desc,
  enabled,
  onToggle,
  color,
}: {
  icon: typeof Facebook;
  label: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4.5 w-4.5 ${color}`} />
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
