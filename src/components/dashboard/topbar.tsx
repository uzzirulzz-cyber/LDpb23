"use client";

import { Menu, Search, Bell, Sun, Moon, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from "./sidebar";
import { useDashboard } from "@/lib/store";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { MiniAvatar } from "./ui-helpers";
import { trackLead } from "@/lib/pixel";
import { toast } from "sonner";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { displayCurrency, setDisplayCurrency, setSection } = useDashboard();

  useEffect(() => {
    const markMounted = () => setMounted(true);
    markMounted();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, orders, products, contacts…"
          className="h-9 pl-9 pr-4 border-0 bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter") { setSection("leads"); toast("Search", { description: "Jumped to Leads Explorer" }); }
          }}
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">Display</span>
          <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
            <SelectTrigger className="h-9 w-[92px] gap-1.5 font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button size="sm" className="hidden h-9 gap-1.5 sm:inline-flex" onClick={() => {
          trackLead(2500, displayCurrency, "demo@playbeat.digital", "+923001234567");
          toast.success("Meta Pixel Lead event fired", { description: `Tracked Lead ($2,500 ${displayCurrency}) client + CAPI` });
        }}>
          <Plus className="h-4 w-4" /> Track Lead
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {mounted && theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
        </Button>
        <button className="flex items-center gap-2 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-3 transition-colors hover:bg-muted/50">
          <MiniAvatar name="Hira Sheikh" size="sm" />
          <div className="hidden text-left leading-tight md:block">
            <div className="text-xs font-semibold">Hira Sheikh</div>
            <div className="text-[10px] text-muted-foreground">Admin</div>
          </div>
        </button>
      </div>
    </header>
  );
}
