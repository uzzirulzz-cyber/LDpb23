// Rapid Gateway payment integration — server-side only.
// All credentials live in process.env. Never expose to frontend.

import crypto from "crypto";

const MERCHANT_ID = process.env.RAPID_GATEWAY_MERCHANT_ID || "";
const SECRET_KEY = process.env.RAPID_GATEWAY_SECRET_KEY || "";
const WEBHOOK_SALT = process.env.RAPID_GATEWAY_WEBHOOK_SALT || "";
const OAUTH_URL = process.env.RAPID_GATEWAY_OAUTH_URL || "https://secure.rapid-gateway.com/oauth2/token";
const TXN_URL = process.env.RAPID_GATEWAY_TXN_URL || "https://secure.rapid-gateway.com/rapid/process-transaction";
const BASE_URL = process.env.RAPID_GATEWAY_BASE_URL || "http://localhost:3000";

export function isRapidGatewayConfigured(): boolean {
  return Boolean(MERCHANT_ID && SECRET_KEY);
}

/**
 * Step 1: Get OAuth2 bearer token using client_credentials grant.
 */
export async function getAccessToken(): Promise<string> {
  if (!isRapidGatewayConfigured()) {
    throw new Error("Rapid Gateway not configured");
  }

  const credentials = Buffer.from(`${MERCHANT_ID}:${SECRET_KEY}`).toString("base64");
  console.log("[rapid-gateway] Requesting OAuth token from", OAUTH_URL);

  const response = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
  });

  const responseText = await response.text();
  console.log("[rapid-gateway] OAuth response:", response.status);

  if (!response.ok) {
    throw new Error(`OAuth failed (${response.status}): ${responseText.substring(0, 200)}`);
  }

  const data = JSON.parse(responseText) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`OAuth error: ${data.error || "no access_token"}`);
  }

  return data.access_token;
}

export interface TransactionParams {
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
}

export interface TransactionResult {
  checkoutUrl: string;
  merchantTransactionId: string;
}

/**
 * Step 2: Submit transaction to Rapid Gateway.
 * Rapid Gateway returns a 302 redirect with Location header containing
 * the hosted checkout URL.
 */
export async function createTransaction(params: TransactionParams): Promise<TransactionResult> {
  const token = await getAccessToken();

  // Amount must be a plain integer string — Rapid Gateway expects "2999" not "2999.00"
  const txnAmt = String(Math.round(params.amount));

  const formData = new URLSearchParams();
  formData.append("MERCHANT_ID", MERCHANT_ID);
  formData.append("MERCHANT_NAME", "Playbeat Digital");
  formData.append("TXNAMT", txnAmt);
  formData.append("CURRENCY_CODE", params.currency);
  formData.append("CUSTOMER_MOBILE_NO", params.customerPhone || "03000000000");
  formData.append("CUSTOMER_EMAIL_ADDRESS", params.customerEmail);
  formData.append("BASKET_ID", params.orderNumber);
  formData.append("SUCCESS_URL", `${BASE_URL}/payment/success?order=${params.orderNumber}`);
  formData.append("FAILURE_URL", `${BASE_URL}/payment/failure?order=${params.orderNumber}`);
  formData.append("CHECKOUT_URL", `${BASE_URL}/payment/complete?order=${params.orderNumber}`);
  formData.append("VERSION", "MY_VER_1.0");
  formData.append("PROCCODE", "0");

  console.log("[rapid-gateway] Submitting txn:", { txnAmt, currency: params.currency, order: params.orderNumber });

  const response = await fetch(TXN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
    body: formData.toString(),
    redirect: "manual",
  });

  console.log("[rapid-gateway] Txn response:", response.status);

  // Rapid Gateway returns 302 with Location header
  const location = response.headers.get("location");
  if (location) {
    console.log("[rapid-gateway] Checkout URL:", location.substring(0, 80) + "...");
    return { checkoutUrl: location, merchantTransactionId: params.orderNumber };
  }

  // Fallback: try JSON response
  const text = await response.text();
  console.log("[rapid-gateway] Response body:", text.substring(0, 300));

  if (response.status >= 200 && response.status < 400) {
    try {
      const json = JSON.parse(text);
      const url = json.checkoutUrl || json.checkout_url || json.redirectUrl || json.url;
      if (url) return { checkoutUrl: url, merchantTransactionId: params.orderNumber };
    } catch {
      if (text.startsWith("http")) return { checkoutUrl: text.trim(), merchantTransactionId: params.orderNumber };
    }
  }

  throw new Error(`Transaction failed (${response.status}): ${text.substring(0, 300)}`);
}

/**
 * Verify Rapid Gateway webhook signature.
 * HMAC-SHA256(salt, timestamp + "." + rawBody), uppercase hex.
 */
export function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  if (!WEBHOOK_SALT) {
    console.warn("[rapid-gateway] Webhook salt not configured");
    return false;
  }

  const ts = Number(timestamp);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const message = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SALT)
    .update(message)
    .digest("hex")
    .toUpperCase();

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface WebhookPayload {
  eventId: string;
  eventType: string;
  source: string;
  merchantId: number;
  gatewayTxnRef: string;
  merchantTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  environment: string;
  occurredAt: string;
}

export function parseWebhookPayload(rawBody: string): WebhookPayload | null {
  try {
    return JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return null;
  }
}
