"use client";

import Image from "next/image";
import {
  LayoutDashboard, Users, Contact, Building2, Filter, Plug,
  Waves, Workflow, Gavel, Bot, Inbox, ShoppingCart, Package,
  BarChart3, Plug2, ScrollText, Settings, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type SectionId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type NavItem = { id: SectionId; label: string; icon: typeof Users };

const GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "CRM",
    items: [
      { id: "leads", label: "Leads Explorer", icon: Users },
      { id: "contacts", label: "Contacts", icon: Contact },
      { id: "accounts", label: "Accounts", icon: Building2 },
      { id: "inbox", label: "Inbox", icon: Inbox },
    ],
  },
  {
    group: "Engines",
    items: [
      { id: "funnels", label: "Funnels", icon: Filter },
      { id: "api-runs", label: "API Runs", icon: Plug },
      { id: "waterfall", label: "Waterfall Engine", icon: Waves },
      { id: "workflows", label: "Workflows", icon: Workflow },
      { id: "rules", label: "Rules", icon: Gavel },
      { id: "bots", label: "Bots", icon: Bot },
    ],
  },
  {
    group: "Commerce",
    items: [
      { id: "customers", label: "Customers", icon: Users },
      { id: "orders", label: "Orders", icon: ShoppingCart },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "System",
    items: [
      { id: "integrations", label: "Integrations", icon: Plug2 },
      { id: "audit", label: "Audit Logs", icon: ScrollText },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function CrmSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useDashboard();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Image src="/playbeat-logo.png" alt="Playbeat" width={34} height={34} className="rounded-lg" priority />
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight">PLAYBEAT</div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Radio className="h-2.5 w-2.5 fill-primary" /> Pulse CRM
          </div>
        </div>
      </div>

      <nav className="scroll-thin flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {GROUPS.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.group}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => { setSection(item.id); onNavigate?.(); }}
                  className={cn(
                    "w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium transition-all",
                    section === item.id
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        <Link href="/" className="block">
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Package className="h-3.5 w-3.5" /> Storefront
          </Button>
        </Link>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">playbeat.digital</div>
            <div className="text-emerald-600/70 dark:text-emerald-400/70">Live · PKR base</div>
          </div>
        </div>
      </div>
    </div>
  );
}
