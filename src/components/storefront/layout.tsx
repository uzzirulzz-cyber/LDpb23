"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { StorefrontHeader } from "./header";
import { StorefrontFooter } from "./footer";

/**
 * StorefrontLayout — wraps storefront pages with ThemeProvider, sticky glass
 * header, and footer. Used per-page (NOT as a Next layout.tsx) so the /crm
 * route is left untouched.
 */
export function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <StorefrontHeader />
        <main className="flex-1">{children}</main>
        <StorefrontFooter />
      </div>
    </ThemeProvider>
  );
}
