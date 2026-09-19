// Playbeat.digital — Email integration
// Supports two providers configured via EMAIL_PROVIDER env var:
//   - "smtp":  nodemailer transport (SMTP_HOST/PORT/USER/PASS)
//   - "sendgrid": SendGrid v3 REST API (EMAIL_API_KEY)
// All credentials from env. Never hardcoded. Never exposed to frontend.

import { db } from "@/lib/db";

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@playbeat.digital";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export function isEmailConfigured(): boolean {
  if (EMAIL_PROVIDER === "sendgrid") {
    return Boolean(EMAIL_API_KEY && EMAIL_FROM);
  }
  // SMTP
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

// ─── TEMPLATES ───────────────────────────────────────────────────
export interface EmailTemplate {
  key: string;
  subject: string;
  html: string;
  text: string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  order_confirmation: {
    key: "order_confirmation",
    subject: `[Playbeat] Order #{{order_id}} confirmed`,
    text: `Hi {{customer_name}},

Thank you for your Playbeat order!

Order #: {{order_id}}
Amount: {{amount}} {{currency}}

We'll send you another email once your payment has been verified and your order is being processed.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}} 👋</h2>
      <p>Thank you for your Playbeat order!</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Order #</td><td><strong>{{order_id}}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Amount</td><td><strong>{{amount}} {{currency}}</strong></td></tr>
      </table>
      <p>We'll send you another email once your payment has been verified and your order is being processed.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  payment_received: {
    key: "payment_received",
    subject: `[Playbeat] Payment received for order #{{order_id}}`,
    text: `Hi {{customer_name}},

We've received your payment of {{amount}} {{currency}} for order #{{order_id}}.

It's now under verification. We'll notify you the moment it's confirmed.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>We've received your payment of <strong>{{amount}} {{currency}}</strong> for order <strong>#{{order_id}}</strong>.</p>
      <p>It's now under verification. We'll notify you the moment it's confirmed.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  payment_under_review: {
    key: "payment_under_review",
    subject: `[Playbeat] Payment under review — order #{{order_id}}`,
    text: `Hi {{customer_name}},

Your payment for order #{{order_id}} is now under verification.

Our team is reviewing the payment and will confirm it shortly. You'll receive another email as soon as your order moves to processing.

Thanks for your patience.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>Your payment for order <strong>#{{order_id}}</strong> is now under verification.</p>
      <p>Our team is reviewing the payment and will confirm it shortly. You'll receive another email as soon as your order moves to processing.</p>
      <p>Thanks for your patience 🙏</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  payment_verified: {
    key: "payment_verified",
    subject: `[Playbeat] Payment verified — order #{{order_id}}`,
    text: `Hi {{customer_name}},

Great news! Your payment for order #{{order_id}} has been verified and your order is now being processed.

We'll let you know as soon as it's completed.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Great news, {{customer_name}}! ✅</h2>
      <p>Your payment for order <strong>#{{order_id}}</strong> has been verified and your order is now being processed.</p>
      <p>We'll let you know as soon as it's completed.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  order_processing: {
    key: "order_processing",
    subject: `[Playbeat] Order #{{order_id}} is now processing`,
    text: `Hi {{customer_name}},

Your order #{{order_id}} is now being processed 🛠️

We're preparing your digital delivery / license keys. Hang tight!

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>Your order <strong>#{{order_id}}</strong> is now being processed 🛠️</p>
      <p>We're preparing your digital delivery / license keys. Hang tight!</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  order_completed: {
    key: "order_completed",
    subject: `[Playbeat] Order #{{order_id}} complete 🎉`,
    text: `Hi {{customer_name}},

Your Playbeat order is complete!

Order #: {{order_id}}

Your digital products / license keys have been delivered. If you have any issues, just reply to this email.

Thanks for choosing Playbeat Digital!

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>🎉 Your Playbeat order is complete!</h2>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Order #</td><td><strong>{{order_id}}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Customer</td><td>{{customer_name}}</td></tr>
      </table>
      <p>Your digital products / license keys have been delivered. If you have any issues, just reply to this email.</p>
      <p>Thanks for choosing Playbeat Digital!</p>
    </div>`,
  },
  payment_failed: {
    key: "payment_failed",
    subject: `[Playbeat] Payment failed — order #{{order_id}}`,
    text: `Hi {{customer_name}},

Unfortunately, the payment for your Playbeat order #{{order_id}} could not be verified or has failed.

Reason: {{reason}}

You can retry the payment from your account, or contact our support team if you believe this is an error.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>Unfortunately, the payment for your Playbeat order <strong>#{{order_id}}</strong> could not be verified or has failed.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>You can retry the payment from your account, or contact our support team if you believe this is an error.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  refund: {
    key: "refund",
    subject: `[Playbeat] Refund processed — order #{{order_id}}`,
    text: `Hi {{customer_name}},

A refund of {{amount}} {{currency}} has been processed for your order #{{order_id}}.

Please allow 3–5 business days for the funds to appear in your account.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>A refund of <strong>{{amount}} {{currency}}</strong> has been processed for your order <strong>#{{order_id}}</strong>.</p>
      <p>Please allow 3–5 business days for the funds to appear in your account.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  cancellation: {
    key: "cancellation",
    subject: `[Playbeat] Order #{{order_id}} cancelled`,
    text: `Hi {{customer_name}},

Your Playbeat order #{{order_id}} has been cancelled.

Reason: {{reason}}

If you have any questions, just reply to this email.

— Playbeat Digital`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>Your Playbeat order <strong>#{{order_id}}</strong> has been cancelled.</p>
      <p><strong>Reason:</strong> {{reason}}</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>— Playbeat Digital</p>
    </div>`,
  },
  customer_support: {
    key: "customer_support",
    subject: `[Playbeat] Support: {{subject}}`,
    text: `Hi {{customer_name}},

{{message}}

— Playbeat Digital Support`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Hi {{customer_name}},</h2>
      <p>{{message}}</p>
      <p>— Playbeat Digital Support</p>
    </div>`,
  },
};

export function formatEmailTemplate(
  templateKey: string,
  variables: Record<string, string>
): { subject: string; html: string; text: string } {
  const tpl = EMAIL_TEMPLATES[templateKey];
  if (!tpl) {
    throw new Error(`Unknown email template: ${templateKey}`);
  }
  const apply = (s: string): string => {
    let out = s;
    for (const [k, v] of Object.entries(variables)) {
      out = out.split(`{{${k}}}`).join(String(v ?? ""));
    }
    return out;
  };
  return { subject: apply(tpl.subject), html: apply(tpl.html), text: apply(tpl.text) };
}

// ─── SMTP TRANSPORT (lazy-loaded so dev environments without nodemailer don't crash on import) ──
let cachedTransport: unknown = null;
async function getSmtpTransport(): Promise<{ sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }> }> {
  if (cachedTransport) return cachedTransport as { sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }> };
  // Dynamic import — nodemailer may not be installed in some environments.
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  cachedTransport = transport;
  return transport as unknown as { sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }> };
}

// ─── SENDGRID ────────────────────────────────────────────────────
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ messageId: string | null; raw: unknown }> {
  const res = await fetch(SENDGRID_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SendGrid error (${res.status}): ${errText.substring(0, 300)}`);
  }

  // SendGrid returns a 202 with an X-Message-Id header
  const messageId = res.headers.get("x-message-id");
  return { messageId, raw: { statusCode: res.status, messageId } };
}

// ─── SMTP ────────────────────────────────────────────────────────
async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ messageId: string | null; raw: unknown }> {
  const transport = await getSmtpTransport();
  const info = await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
  return { messageId: info.messageId ?? null, raw: info };
}

// ─── PUBLIC API ──────────────────────────────────────────────────
export interface EmailSendResult {
  ok: boolean;
  providerMsgId: string | null;
  deliveryStatus: string;
  raw: unknown;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
  orderId?: string,
  opts: {
    customerId?: string;
    templateKey?: string;
    botId?: string;
    staffId?: string;
    actor?: string;
  } = {}
): Promise<EmailSendResult> {
  const actor = opts.actor || "system";

  if (!isEmailConfigured()) {
    const log = await db.communicationLog.create({
      data: {
        orderId: orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "email",
        direction: "outbound",
        recipient: to,
        sender: EMAIL_FROM || null,
        subject,
        message: textBody,
        templateKey: opts.templateKey ?? null,
        deliveryStatus: "failed",
        errorMessage: "Email integration not configured",
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

  try {
    const result =
      EMAIL_PROVIDER === "sendgrid"
        ? await sendViaSendGrid(to, subject, htmlBody, textBody)
        : await sendViaSmtp(to, subject, htmlBody, textBody);

    const log = await db.communicationLog.create({
      data: {
        orderId: orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "email",
        direction: "outbound",
        recipient: to,
        sender: EMAIL_FROM,
        subject,
        message: textBody,
        templateKey: opts.templateKey ?? null,
        providerMsgId: result.messageId,
        deliveryStatus: "sent",
        botId: opts.botId ?? null,
        staffId: opts.staffId ?? null,
      },
    });

    if (orderId) {
      await db.orderTimelineEvent.create({
        data: {
          orderId,
          eventType: "email_sent",
          title: `Email sent: ${opts.templateKey ?? subject}`,
          description: `Email sent to ${to}${result.messageId ? ` (msg ${result.messageId})` : ""}`,
          actor,
          metadata: JSON.stringify({
            templateKey: opts.templateKey ?? null,
            to,
            subject,
            providerMsgId: result.messageId,
            logId: log.id,
          }),
        },
      });
    }

    return {
      ok: true,
      providerMsgId: result.messageId,
      deliveryStatus: "sent",
      raw: result.raw,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    await db.communicationLog.create({
      data: {
        orderId: orderId ?? null,
        customerId: opts.customerId ?? null,
        channel: "email",
        direction: "outbound",
        recipient: to,
        sender: EMAIL_FROM,
        subject,
        message: textBody,
        templateKey: opts.templateKey ?? null,
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

// Convenience wrapper: send by template key.
export async function sendEmailTemplate(
  to: string,
  templateKey: string,
  variables: Record<string, string>,
  opts: { orderId?: string; customerId?: string; botId?: string; staffId?: string; actor?: string } = {}
): Promise<EmailSendResult> {
  const { subject, html, text } = formatEmailTemplate(templateKey, variables);
  return sendEmail(to, subject, html, text, opts.orderId, {
    customerId: opts.customerId,
    templateKey,
    botId: opts.botId,
    staffId: opts.staffId,
    actor: opts.actor,
  });
}
