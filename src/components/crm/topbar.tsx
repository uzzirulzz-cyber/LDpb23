"use client";

import { Menu, Search, Bell, Sun, Moon, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrmSidebar } from "./sidebar";
import { useDashboard } from "@/lib/store";
import { CURRENCIES, type Currency } from "@/lib/currency";
import { trackLead } from "@/lib/pixel";
import { toast } from "sonner";

export function CrmTopbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { displayCurrency, setDisplayCurrency } = useDashboard();

  useEffect(() => {
    const mark = () => setMounted(true);
    mark();
  }, []);

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <CrmSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads, contacts, orders, accounts…"
          className="h-9 border-0 bg-muted/50 pl-9 focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-muted-foreground lg:inline">Currency</span>
          <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
            <SelectTrigger className="h-9 w-[92px] gap-1.5 font-semibold"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <Button size="sm" className="hidden h-9 gap-1.5 sm:inline-flex" onClick={() => {
          trackLead(2500, displayCurrency, "demo@playbeat.digital", "+923001234567");
          toast.success("Meta Pixel Lead event fired", { description: `Tracked Lead (${displayCurrency}) client + CAPI` });
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
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">PA</span>
          <div className="hidden text-left leading-tight md:block">
            <div className="text-xs font-semibold">Playbeat Admin</div>
            <div className="text-[10px] text-muted-foreground">Administrator</div>
          </div>
        </button>
      </div>
    </header>
  );
}
