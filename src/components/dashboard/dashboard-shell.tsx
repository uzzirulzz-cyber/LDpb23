"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useDashboard } from "@/lib/store";
import { DashboardFooter } from "./footer";

// Code-split sections for optimal memory usage. On the user's browser these
// load on demand; the dev server compiles each chunk on first request.
const LeadDetailDrawer = dynamic(() => import("./lead-detail-drawer").then((m) => m.LeadDetailDrawer), { ssr: false });
const SalesAnalyticsSection = dynamic(() => import("./sections/sales-analytics").then((m) => m.SalesAnalyticsSection), { ssr: false });
const LeadsSection = dynamic(() => import("./sections/leads").then((m) => m.LeadsSection), { ssr: false });
const ContactsSection = dynamic(() => import("./sections/contacts").then((m) => m.ContactsSection), { ssr: false });
const QuotesSection = dynamic(() => import("./sections/quotes").then((m) => m.QuotesSection), { ssr: false });
const WorkflowsSection = dynamic(() => import("./sections/workflows").then((m) => m.WorkflowsSection), { ssr: false });
const WaterfallSection = dynamic(() => import("./sections/waterfall").then((m) => m.WaterfallSection), { ssr: false });
const SeatsSection = dynamic(() => import("./sections/seats").then((m) => m.SeatsSection), { ssr: false });
const OutreachSection = dynamic(() => import("./sections/outreach").then((m) => m.OutreachSection), { ssr: false });
const CrawlersSection = dynamic(() => import("./sections/crawlers").then((m) => m.CrawlersSection), { ssr: false });
const CmsSection = dynamic(() => import("./sections/cms").then((m) => m.CmsSection), { ssr: false });
const HomepageSection = dynamic(() => import("./sections/homepage").then((m) => m.HomepageSection), { ssr: false });
const TrafficSection = dynamic(() => import("./sections/traffic").then((m) => m.TrafficSection), { ssr: false });
const OrdersSection = dynamic(() => import("./sections/orders").then((m) => m.OrdersSection), { ssr: false });
const InventorySection = dynamic(() => import("./sections/inventory").then((m) => m.InventorySection), { ssr: false });
const ProductsSection = dynamic(() => import("./sections/products").then((m) => m.ProductsSection), { ssr: false });

export function DashboardShell() {
  const section = useDashboard((s) => s.section);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const mark = () => setMounted(true);
    mark();
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen"><Sidebar /></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            {!mounted ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>
            ) : (
              <>
                {section === "sales-analytics" && <SalesAnalyticsSection />}
                {section === "leads" && <LeadsSection />}
                {section === "contacts" && <ContactsSection />}
                {section === "quotes" && <QuotesSection />}
                {section === "workflows" && <WorkflowsSection />}
                {section === "waterfall" && <WaterfallSection />}
                {section === "seats" && <SeatsSection />}
                {section === "outreach" && <OutreachSection />}
                {section === "crawlers" && <CrawlersSection />}
                {section === "cms" && <CmsSection />}
                {section === "homepage" && <HomepageSection />}
                {section === "traffic" && <TrafficSection />}
                {section === "orders" && <OrdersSection />}
                {section === "inventory" && <InventorySection />}
                {section === "products" && <ProductsSection />}
              </>
            )}
          </div>
        </main>
        <DashboardFooter />
      </div>
      <LeadDetailDrawer />
    </div>
  );
}
