"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useDashboard } from "@/lib/store";
import { OverviewSection } from "./sections/overview";
import { LeadsSection } from "./sections/leads";
import { PipelineSection } from "./sections/pipeline";
import { MessagesSection } from "./sections/messages";
import { AnalyticsSection } from "./sections/analytics";
import { SettingsSection } from "./sections/settings";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { DashboardFooter } from "./footer";

export function DashboardShell() {
  const section = useDashboard((s) => s.section);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {section === "overview" && <OverviewSection />}
            {section === "leads" && <LeadsSection />}
            {section === "pipeline" && <PipelineSection />}
            {section === "messages" && <MessagesSection />}
            {section === "analytics" && <AnalyticsSection />}
            {section === "settings" && <SettingsSection />}
          </div>
        </main>
        <DashboardFooter />
      </div>

      <LeadDetailDrawer />
    </div>
  );
}
