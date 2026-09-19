import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText, isWhatsAppConfigured, getWhatsAppCallLink } from "@/lib/whatsapp";
import { db } from "@/lib/db";

// POST /api/crm/whatsapp/send — send a free-text WhatsApp message
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, message, threadId, staffId } = body;
  if (!phone || !message) return NextResponse.json({ error: "phone and message required" }, { status: 400 });

  const result = await sendWhatsAppText(phone, message, { staffId, actor: staffId ? `staff:${staffId}` : "system" });

  // Store in InboxMessage if threadId provided
  if (threadId) {
    await db.inboxMessage.create({
      data: { threadId, direction: "outbound", content: message, channel: "whatsapp" },
    });
    await db.inboxThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
  }

  return NextResponse.json({ data: result });
}
