"use client";

import { create } from "zustand";
import type { Currency } from "./currency";

export type SectionId =
  | "dashboard" | "leads" | "contacts" | "accounts"
  | "funnels" | "api-runs" | "waterfall" | "workflows" | "rules"
  | "bots" | "inbox" | "whatsapp" | "customers" | "orders" | "notifications"
  | "analytics" | "integrations" | "audit" | "settings"
  // OPS — Operations
  | "ops-dashboard" | "ops-fulfillment" | "ops-shipping" | "ops-suppliers"
  // EMP — Employees
  | "emp-directory" | "emp-attendance" | "emp-payroll" | "emp-performance";

interface State {
  section: SectionId;
  setSection: (s: SectionId) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useDashboard = create<State>((set) => ({
  section: "dashboard",
  setSection: (section) => set({ section }),
  displayCurrency: "PKR",
  setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
  selectedLeadId: null,
  setSelectedLeadId: (selectedLeadId) => set({ selectedLeadId }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
