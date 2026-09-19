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

// ============ OPS ============
export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  category: string | null; // digital | hardware | service
  status: string; // active | inactive
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  status: string; // pending | shipped | in_transit | delivered | returned
  shippedAt: string | null;
  deliveredAt: string | null;
  address: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  productId: string | null;
  stock: number;
  reserved: number;
  reorderLevel: number;
  location: string;
  cost: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; slug: string; digital: boolean; active: boolean } | null;
}

// ============ EMP ============
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string; // admin | manager | sales | ops | support | staff
  department: string | null; // sales | ops | support | finance | tech
  status: string; // active | on_leave | inactive
  salary: number;
  currency: string;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string; // present | absent | late | half_day | leave
  notes: string | null;
  createdAt: string;
  employee?: Pick<Employee, "id" | "name" | "email" | "department" | "role">;
}
