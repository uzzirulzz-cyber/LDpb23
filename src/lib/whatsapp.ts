// Playbeat.digital — WhatsApp Business API integration (Meta Cloud API)
// All credentials live in process.env. Never expose to frontend.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import { db } from "@/lib/db";

const WHATSAPP_API_VERSION = "v20.0";
const WHATSAPP_BASE_URL = "https://graph.facebook.com";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
export const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";

export function isWhatsAppConfigured(): boolean {
  return Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID);
}

// ─── TEMPLATES ───────────────────────────────────────────────────
// Each template contains {{variable}} placeholders that get replaced
// at send-time by formatTemplate(). These mirror the message templates
// approved in the Meta WhatsApp Business Manager.
export interface WhatsAppTemplate {
  key: string;
  language: string;
  // For text mode (when no approved HSM template exists yet, we send text).
  // When using an approved template, the template name on Meta's side
  // is the same as `key`.
  body: string;
}

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplate> = {
  order_received: {
    key: "order_received",
    language: "en_US",
    body: `Hi {{customer_name}} 👋

Thank you for your Playbeat order!

Order #: {{order_id}}
Amount: {{amount}} {{currency}}

We've received your order and will start processing it right away. You'll get updates here as your order progresses.

— Playbeat Digital`,
  },
  payment_under_review: {
    key: "payment_under_review",
    language: "en_US",
    body: `Hi {{customer_name}},

We've received your payment for order #{{order_id}} and it's now under verification.

Our team is reviewing the payment and will confirm it shortly. You'll be notified the moment your order moves to processing.

Thanks for your patience 🙏
— Playbeat Digital`,
  },
  payment_verified: {
    key: "payment_verified",
    language: "en_US",
    body: `Great news, {{customer_name}}! ✅

Your payment for order #{{order_id}} has been verified and your order is now being processed.

We'll let you know as soon as it's completed.

— Playbeat Digital`,
  },
  order_processing: {
    key: "order_processing",
    language: "en_US",
    body: `Hi {{customer_name}},

Your order #{{order_id}} is now being processed 🛠️

We're preparing your digital delivery / license keys. Hang tight!

— Playbeat Digital`,
  },
  order_completed: {
    key: "order_completed",
    language: "en_US",
    body: `🎉 Your Playbeat order is complete!

Order #: {{order_id}}
Customer: {{customer_name}}

Your digital products / license keys have been delivered to your email. If you have any issues, just reply to this message.

Thanks for choosing Playbeat Digital!
— Playbeat Digital`,
  },
  payment_failed: {
    key: "payment_failed",
    language: "en_US",
    body: `Hi {{customer_name}},

Unfortunately, the payment for your Playbeat order #{{order_id}} could not be verified or has failed.

Reason: {{reason}}

You can retry the payment from your account, or contact our support team if you believe this is an error.

— Playbeat Digital`,
  },
  verification_required: {
    key: "verification_required",
    language: "en_US",
    body: `Hi {{customer_name}},

Your payment for order #{{order_id}} requires additional verification. Our team has been notified and will reach out if any further information is needed.

Thanks for your patience 🙏
— Playbeat Digital`,
  },
};

// ─── FORMATTER ───────────────────────────────────────────────────
export function formatTemplate(
  templateKey: string,
  variables: Record<string, string>
): string {
  const tpl = WHATSAPP_TEMPLATES[templateKey];
  if (!tpl) {
    throw new Error(`Unknown WhatsApp template: ${templateKey}`);
  }
  let body = tpl.body;
  for (const [k, v] of Object.entries(variables)) {
    body = body.split(`{{${k}}}`).join(String(v ?? ""));
  }
  return body;
}

// ─── PHONE NORMALIZATION ─────────────────────────────────────────
// Meta expects international format without "+", spaces, or dashes.
function normalizePhone(phone: string): string {
  let p = phone.trim();
  if (p.startsWith("+")) p = p.slice(1);
  p = p.replace(/[\s\-()]/g, "");
  // Pakistan default if no country code
  if (/^0\d{10}$/.test(p)) p = "92" + p.slice(1);
  return p;
}

// ─── SENDER ──────────────────────────────────────────────────────
export interface WhatsAppSendResult {
  ok: boolean;
  providerMsgId: string | null;
  deliveryStatus: string;
  raw: unknown;
  error?: string;
}

/**
 * Send a WhatsApp message via Meta Cloud API.
 * Stores a CommunicationLog with the provider message id + delivery status.
 *
 * @param to recipient phone (international format preferred)
 * @param templateKey key into WHATSAPP_TEMPLATES
 * @param variables replacement map for {{placeholders}}
 * @param opts.orderId / customerId / actor info for the CommunicationLog
 */
export async function sendWhatsAppMessage(
  to: string,
  templateKey: string,
  variables: Record<string, string>,
  opts: {
    orderId?: string;
    customerId?: string;
    botId?: string;
    staffId?: string;
    actor?: string;
  } = {}
): Promise<WhatsAppSendResult> {
  const actor = opts.actor || "system";

  // 1. Configuration check — NEVER pretend to succeed.
  if (!isWhatsAppConfigured()) {
    const log = await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "whatsapp",
        direction: "outbound",
        recipient: to,
        message: formatTemplateSafe(templateKey, variables),
        templateKey,
        deliveryStatus: "failed",
        errorMessage: "WhatsApp integration not configured",
        botId: opts.botId ?? null,
        staffId: opts.staffId ?? null,
      },
    });
    return {
      ok: false,
      providerMsgId: null,
      deliveryStatus: "failed",
      raw: { logId: log.id },
      error: "Integration Not Configured",
    };
  }

  const recipientPhone = normalizePhone(to);
  const messageBody = formatTemplate(templateKey, variables);

  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "text",
    text: {
      preview_url: false,
      body: messageBody,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }

    if (!res.ok) {
      const errMsg = extractError(parsed) || `HTTP ${res.status}`;
      const log = await db.communicationLog.create({
        data: {
          orderId: opts.orderId ?? null,
          customerId: opts.customerId ?? null,
          channel: "whatsapp",
          direction: "outbound",
          recipient: to,
          message: messageBody,
          templateKey,
          deliveryStatus: "failed",
          errorMessage: errMsg,
          botId: opts.botId ?? null,
          staffId: opts.staffId ?? null,
        },
      });
      return {
        ok: false,
        providerMsgId: null,
        deliveryStatus: "failed",
        raw: parsed,
        error: errMsg,
      };
    }

    // Success — extract the message id from the response.
    const providerMsgId =
      (parsed as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null;

    const log = await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "whatsapp",
        direction: "outbound",
        recipient: to,
        message: messageBody,
        templateKey,
        providerMsgId,
        deliveryStatus: "sent",
        botId: opts.botId ?? null,
        staffId: opts.staffId ?? null,
      },
    });

    // Timeline event (if order-scoped)
    if (opts.orderId) {
      await db.orderTimelineEvent.create({
        data: {
          orderId: opts.orderId,
          eventType: "whatsapp_sent",
          title: `WhatsApp sent: ${templateKey}`,
          description: `Message sent to ${to}${providerMsgId ? ` (msg ${providerMsgId})` : ""}`,
          actor,
          metadata: JSON.stringify({
            templateKey,
            to,
            providerMsgId,
            logId: log.id,
          }),
        },
      });
    }

    return {
      ok: true,
      providerMsgId,
      deliveryStatus: "sent",
      raw: parsed,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "whatsapp",
        direction: "outbound",
        recipient: to,
        message: messageBody,
        templateKey,
        deliveryStatus: "failed",
        errorMessage: errMsg,
        botId: opts.botId ?? null,
        staffId: opts.staffId ?? null,
      },
    });
    return {
      ok: false,
      providerMsgId: null,
      deliveryStatus: "failed",
      raw: null,
      error: errMsg,
    };
  }
}

function formatTemplateSafe(
  templateKey: string,
  variables: Record<string, string>
): string {
  try {
    return formatTemplate(templateKey, variables);
  } catch {
    return JSON.stringify(variables);
  }
}

function extractError(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const err = (parsed as { error?: { message?: string } }).error;
  return err?.message ?? null;
}

// ─── FREE TEXT MESSAGE ───────────────────────────────────────────
/**
 * Send a free-text WhatsApp message (not a template).
 * Used by the CRM WhatsApp chat interface for custom messages.
 */
export async function sendWhatsAppText(
  to: string,
  message: string,
  opts: {
    orderId?: string;
    customerId?: string;
    staffId?: string;
    botId?: string;
    actor?: string;
  } = {}
): Promise<WhatsAppSendResult> {
  const actor = opts.actor || "system";

  if (!isWhatsAppConfigured()) {
    const log = await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "whatsapp",
        direction: "outbound",
        recipient: to,
        message,
        deliveryStatus: "failed",
        errorMessage: "WhatsApp integration not configured",
        botId: opts.botId ?? null,
        staffId: opts.staffId ?? null,
      },
    });
    return { ok: false, providerMsgId: null, deliveryStatus: "failed", raw: { logId: log.id }, error: "Integration Not Configured" };
  }

  const recipientPhone = normalizePhone(to);
  const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "text",
    text: { preview_url: true, body: message },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const rawText = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }

    if (!res.ok) {
      const errMsg = extractError(parsed) || `HTTP ${res.status}`;
      await db.communicationLog.create({
        data: {
          orderId: opts.orderId ?? null, customerId: opts.customerId ?? null,
          channel: "whatsapp", direction: "outbound", recipient: to,
          message, deliveryStatus: "failed", errorMessage: errMsg,
          botId: opts.botId ?? null, staffId: opts.staffId ?? null,
        },
      });
      return { ok: false, providerMsgId: null, deliveryStatus: "failed", raw: parsed, error: errMsg };
    }

    const providerMsgId = (parsed as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id ?? null;

    const log = await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null, customerId: opts.customerId ?? null,
        channel: "whatsapp", direction: "outbound", recipient: to,
        message, providerMsgId, deliveryStatus: "sent",
        botId: opts.botId ?? null, staffId: opts.staffId ?? null,
      },
    });

    if (opts.orderId) {
      await db.orderTimelineEvent.create({
        data: {
          orderId: opts.orderId, eventType: "whatsapp_sent",
          title: "WhatsApp message sent", description: `Sent to ${to}`,
          actor, metadata: JSON.stringify({ to, providerMsgId, logId: log.id }),
        },
      });
    }

    return { ok: true, providerMsgId, deliveryStatus: "sent", raw: parsed };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    await db.communicationLog.create({
      data: {
        orderId: opts.orderId ?? null, customerId: opts.customerId ?? null,
        channel: "whatsapp", direction: "outbound", recipient: to,
        message, deliveryStatus: "failed", errorMessage: errMsg,
        botId: opts.botId ?? null, staffId: opts.staffId ?? null,
      },
    });
    return { ok: false, providerMsgId: null, deliveryStatus: "failed", raw: null, error: errMsg };
  }
}

// ─── CALLING LINKS ───────────────────────────────────────────────
/**
 * Generate WhatsApp call links (wa.me).
 * Voice call: https://wa.me/{phone} (opens chat, user taps call button)
 * Video call: same link — WhatsApp determines call type in-app.
 */
export function getWhatsAppCallLink(phone: string): string {
  return `https://wa.me/${normalizePhone(phone)}`;
}

/**
 * Generate a WhatsApp click-to-chat link with a pre-filled message.
 */
export function getWhatsAppChatLink(phone: string, message?: string): string {
  const p = normalizePhone(phone);
  return message
    ? `https://wa.me/${p}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${p}`;
}

// ─── CONTACT MANAGEMENT ──────────────────────────────────────────
/**
 * Get or create a WhatsApp contact from a phone number.
 * Checks existing InboxThread by phone, creates if missing.
 */
export async function getOrCreateWhatsAppContact(
  phone: string,
  name: string,
  opts: { leadId?: string; contactId?: string } = {}
) {
  const normalizedPhone = normalizePhone(phone);
  const existing = await db.inboxThread.findFirst({
    where: { channel: "whatsapp", customerName: name },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (existing) return existing;

  return db.inboxThread.create({
    data: {
      leadId: opts.leadId ?? null,
      contactId: opts.contactId ?? null,
      customerName: name,
      channel: "whatsapp",
      subject: `WhatsApp: ${name}`,
      status: "open",
      lastMessageAt: new Date(),
    },
    include: { messages: true },
  });
}
