import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

// GET /api/crm/whatsapp/contacts — list WhatsApp contacts (from InboxThread)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const where: Record<string, unknown> = { channel: "whatsapp" };
  if (search) where.OR = [{ customerName: { contains: search } }, { subject: { contains: search } }];
  const threads = await db.inboxThread.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });
  return NextResponse.json({
    data: threads.map((t) => ({
      ...t,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      messages: t.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    })),
    configured: isWhatsAppConfigured(),
  });
}

// POST /api/crm/whatsapp/contacts — add a new WhatsApp contact
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, leadId, contactId } = body;
  if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 });
  const existing = await db.inboxThread.findFirst({ where: { channel: "whatsapp", customerName: name } });
  if (existing) return NextResponse.json({ data: { ...existing, createdAt: existing.createdAt.toISOString(), lastMessageAt: existing.lastMessageAt?.toISOString() ?? null } });
  const thread = await db.inboxThread.create({
    data: { customerName: name, channel: "whatsapp", subject: `WhatsApp: ${name}`, status: "open", leadId: leadId ?? null, contactId: contactId ?? null, lastMessageAt: new Date() },
  });
  return NextResponse.json({ data: { ...thread, createdAt: thread.createdAt.toISOString(), lastMessageAt: thread.lastMessageAt?.toISOString() ?? null } });
}
