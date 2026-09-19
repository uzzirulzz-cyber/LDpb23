"use client";

import { create } from "zustand";
import type { Currency } from "./currency";

export type SectionId =
  | "overview"
  | "leads"
  | "pipeline"
  | "messages"
  | "analytics"
  | "settings";

interface DashboardState {
  section: SectionId;
  setSection: (s: SectionId) => void;

  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;

  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;

  // bump to force refresh of data after mutations
  refreshKey: number;
  triggerRefresh: () => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  section: "overview",
  setSection: (section) => set({ section }),

  displayCurrency: "USD",
  setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),

  selectedLeadId: null,
  setSelectedLeadId: (selectedLeadId) => set({ selectedLeadId }),

  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
