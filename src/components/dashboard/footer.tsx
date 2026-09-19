"use client";

import { Radio, Heart } from "lucide-react";

export function DashboardFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background/60 px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground">PLAYBEAT PULSE</span>
          <span className="hidden sm:inline">· Lead Intelligence & Sales CRM</span>
        </div>
        <div className="flex items-center gap-4">
          <span>v1.0.0</span>
          <span className="hidden sm:inline">Multi-currency · PKR / USD / AED</span>
          <span className="hidden items-center gap-1 md:inline-flex">
            Built with <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> on Next.js
          </span>
        </div>
      </div>
    </footer>
  );
}
