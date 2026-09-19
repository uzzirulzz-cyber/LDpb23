"use client";

import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  MessageSquare,
  BarChart3,
  Settings,
  Radio,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard, type SectionId } from "@/lib/store";
import { Button } from "@/components/ui/button";

const NAV: { id: SectionId; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { id: "leads", label: "Leads", icon: Users, group: "Main" },
  { id: "pipeline", label: "Pipeline", icon: KanbanSquare, group: "Main" },
  { id: "messages", label: "Messages", icon: MessageSquare, group: "Main" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Main" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection } = useDashboard();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Radio className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">PLAYBEAT</div>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Zap className="h-2.5 w-2.5 fill-primary" />
            Pulse
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <div className="space-y-1">
            {NAV.filter((n) => n.group === "Main").map((item) => (
              <NavItem key={item.id} item={item} active={section === item.id} onClick={() => { setSection(item.id); onNavigate?.(); }} />
            ))}
          </div>
        </div>
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            System
          </div>
          <div className="space-y-1">
            {NAV.filter((n) => n.group === "System").map((item) => (
              <NavItem key={item.id} item={item} active={section === item.id} onClick={() => { setSection(item.id); onNavigate?.(); }} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer status */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div className="text-xs">
            <div className="font-semibold text-emerald-700 dark:text-emerald-300">All systems live</div>
            <div className="text-emerald-600/70 dark:text-emerald-400/70">Meta Pixel connected</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { id: SectionId; label: string; icon: typeof LayoutDashboard };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-full justify-start gap-3 px-3 font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Button>
  );
}
