import { NextResponse } from "next/server";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

// GET /api/crm/whatsapp/status — check if WhatsApp Business API is configured
export async function GET() {
  return NextResponse.json({
    configured: isWhatsAppConfigured(),
    message: isWhatsAppConfigured() ? "WhatsApp Business API connected" : "WhatsApp integration not configured — set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID",
  });
}
