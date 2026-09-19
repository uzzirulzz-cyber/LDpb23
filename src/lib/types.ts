// Shared frontend types for PLAYBEAT PULSE dashboard
import type { Currency } from "./currency";

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_SOURCES = [
  "website",
  "facebook",
  "instagram",
  "whatsapp",
  "referral",
  "ads",
  "organic",
  "api",
] as const;

export interface Rep {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string | null;
  target: number;
  avatar: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  country: string | null;
  source: string;
  status: LeadStatus;
  value: number;
  currency: Currency;
  score: number;
  tags: string | null;
  assignedTo: string | null;
  rep: Rep | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: string;
  description: string;
  meta: string | null;
  createdAt: string;
  lead?: { id: string; name: string; company: string | null };
}

export interface Message {
  id: string;
  leadId: string;
  channel: string;
  direction: string;
  content: string;
  status: string;
  createdAt: string;
  lead?: { id: string; name: string };
}

export interface DashboardData {
  kpis: {
    totalLeads: number;
    newLeads: number;
    wonDeals: number;
    wonValueUsd: number;
    pipelineValueUsd: number;
    conversionRate: number;
    avgScore: number;
    activeDeals: number;
    messagesToday: number;
  };
  leadsTrend: { date: string; count: number; won: number }[];
  sourceBreakdown: { source: string; count: number; valueUsd: number }[];
  funnel: { stage: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  recentActivities: Activity[];
  repPerformance: { name: string; leads: number; wonUsd: number; target: number }[];
  currencyMix: { currency: string; count: number; valueUsd: number }[];
}

export interface AnalyticsData {
  sourceWaterfall: { source: string; total: number; won: number; lost: number; qualified: number }[];
  conversionBySource: { source: string; rate: number; count: number }[];
  monthlyRevenue: { month: string; revenueUsd: number; deals: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  repLeaderboard: { id: string; name: string; leads: number; won: number; wonUsd: number; target: number; region: string | null }[];
}
