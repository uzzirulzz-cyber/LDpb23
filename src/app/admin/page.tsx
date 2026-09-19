"use client";

import { useDashboard } from "@/lib/store";
import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";
import { CrmFooter } from "@/components/crm/footer";
import dynamic from "next/dynamic";

const DashboardSection = dynamic(() => import("@/components/crm/sections/dashboard").then((m) => m.DashboardSection), { ssr: false });
const LeadsSection = dynamic(() => import("@/components/crm/sections/leads").then((m) => m.LeadsSection), { ssr: false });
const ContactsSection = dynamic(() => import("@/components/crm/sections/contacts").then((m) => m.ContactsSection), { ssr: false });
const AccountsSection = dynamic(() => import("@/components/crm/sections/accounts").then((m) => m.AccountsSection), { ssr: false });
const FunnelsSection = dynamic(() => import("@/components/crm/sections/funnels").then((m) => m.FunnelsSection), { ssr: false });
const ApiRunsSection = dynamic(() => import("@/components/crm/sections/api-runs").then((m) => m.ApiRunsSection), { ssr: false });
const WaterfallSection = dynamic(() => import("@/components/crm/sections/waterfall").then((m) => m.WaterfallSection), { ssr: false });
const WorkflowsSection = dynamic(() => import("@/components/crm/sections/workflows").then((m) => m.WorkflowsSection), { ssr: false });
const RulesSection = dynamic(() => import("@/components/crm/sections/rules").then((m) => m.RulesSection), { ssr: false });
const BotsSection = dynamic(() => import("@/components/crm/sections/bots").then((m) => m.BotsSection), { ssr: false });
const InboxSection = dynamic(() => import("@/components/crm/sections/inbox").then((m) => m.InboxSection), { ssr: false });
const CustomersSection = dynamic(() => import("@/components/crm/sections/customers").then((m) => m.CustomersSection), { ssr: false });
const OrdersSection = dynamic(() => import("@/components/crm/sections/orders").then((m) => m.OrdersSection), { ssr: false });
const AnalyticsSection = dynamic(() => import("@/components/crm/sections/analytics").then((m) => m.AnalyticsSection), { ssr: false });
const IntegrationsSection = dynamic(() => import("@/components/crm/sections/integrations").then((m) => m.IntegrationsSection), { ssr: false });
const AuditSection = dynamic(() => import("@/components/crm/sections/audit").then((m) => m.AuditSection), { ssr: false });
const SettingsSection = dynamic(() => import("@/components/crm/sections/settings").then((m) => m.SettingsSection), { ssr: false });

export default function CrmPage() {
  const section = useDashboard((s) => s.section);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen"><CrmSidebar /></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {section === "dashboard" && <DashboardSection />}
            {section === "leads" && <LeadsSection />}
            {section === "contacts" && <ContactsSection />}
            {section === "accounts" && <AccountsSection />}
            {section === "funnels" && <FunnelsSection />}
            {section === "api-runs" && <ApiRunsSection />}
            {section === "waterfall" && <WaterfallSection />}
            {section === "workflows" && <WorkflowsSection />}
            {section === "rules" && <RulesSection />}
            {section === "bots" && <BotsSection />}
            {section === "inbox" && <InboxSection />}
            {section === "customers" && <CustomersSection />}
            {section === "orders" && <OrdersSection />}
            {section === "analytics" && <AnalyticsSection />}
            {section === "integrations" && <IntegrationsSection />}
            {section === "audit" && <AuditSection />}
            {section === "settings" && <SettingsSection />}
          </div>
        </main>
        <CrmFooter />
      </div>
    </div>
  );
}
