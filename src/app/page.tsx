"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function Home() {
  return (
    <ThemeProvider>
      <DashboardShell />
    </ThemeProvider>
  );
}
