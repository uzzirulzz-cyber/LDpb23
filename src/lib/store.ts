"use client";

import { create } from "zustand";
import type { Currency } from "./currency";

export type SectionId =
  | "sales-analytics"
  | "leads"
  | "contacts"
  | "quotes"
  | "workflows"
  | "waterfall"
  | "seats"
  | "outreach"
  | "crawlers"
  | "cms"
  | "homepage"
  | "traffic"
  | "orders"
  | "inventory"
  | "products";

interface DashboardState {
  section: SectionId;
  setSection: (s: SectionId) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  section: "sales-analytics",
  setSection: (section) => set({ section }),
  displayCurrency: "USD",
  setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
  selectedLeadId: null,
  setSelectedLeadId: (selectedLeadId) => set({ selectedLeadId }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
