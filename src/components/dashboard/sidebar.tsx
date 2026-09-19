"use client";

import Image from "next/image";
import {
  BarChart3, Users, Contact, FileText, Workflow, Waves,
  Armchair, Phone, Bug, FileCode, LayoutTemplate, TrafficCone,
  ShoppingCart, Boxes, Package, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type SectionId } from "@/lib/store";
import { Button } from "@/components/ui/button";

type NavItem = { id: SectionId; label: string; icon: typeof Users };

const GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Sales & CRM",
    items: [
      { id: "sales-analytics", label: "Sales Analytics", icon: BarChart3 },
      { id: "leads", label: "Leads Explorer", icon: Users },
      { id: "contacts", label: "Contacts & Accounts", icon: Contact },
      { id: "quotes", label: "Quotes & Invoices", icon: FileText },
    ],
  },
  {
    group: "Automation",
    items: [
      { id: "workflows", label: "Workflows & Rules", icon: Workflow },
      { id: "waterfall", label: "Waterfall Engine", icon: Waves },
      { id: "seats", label: "4-Seat Capacity", icon: Armchair },
      { id: "outreach", label: "VoIP & Outreach", icon: Phone },
      { id: "crawlers", label: "Crawler Lab", icon: Bug },
    ],
  },
  {
    group: "Storefront",
    items: [
      { id: "cms", label: "Website Builder CMS", icon: FileCode },
      { id: "homepage", label: "Homepage Builder", icon: LayoutTemplate },
      { id: "traffic", label: "Analytics & Traffic", icon: TrafficCone },
    ],
  },
  {
    group: "Commerce",
    items: [
      { id: "orders", label: "Customer Orders Log", icon: ShoppingCart },
      { id: "inventory", label: "Inventory", icon: Boxes },
      { id: "products", label: "Catalog Products", icon: Package },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useDashboard();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand with logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Image src="/playbeat-logo.png" alt="PLAYBEAT PULSE" width={36} height={36} className="rounded-lg" priority />
        <div className="leading-tight">
          <div className="text-sm font-extrabold tracking-tight">PLAYBEAT</div>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Radio className="h-2.5 w-2.5 fill-primary" />
            Pulse CRM
          </div>
        </div>
      </div>

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((g) => (
          <div key={g.group}>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.group}</div>
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

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">playbeat.digital</div>
            <div className="text-emerald-600/70 dark:text-emerald-400/70">All systems live</div>
          </div>
        </div>
      </div>
    </div>
  );
}
