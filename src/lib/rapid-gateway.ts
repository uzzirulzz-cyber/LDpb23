// Rapid Gateway payment integration — server-side only.
// All credentials live in process.env. Never expose to frontend.
//
// Flow:
//   1. getAccessToken() — OAuth2 client_credentials (Basic auth)
//   2. createTransaction() — submit form-encoded txn, get checkout redirect URL
//   3. verifyWebhookSignature() — HMAC-SHA256(salt, timestamp + "." + rawBody)
//
// Webhook events: transaction.completed, transaction.failed, refund.completed, etc.

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
 * Auth: Basic base64(merchantId:secretKey)
 */
export async function getAccessToken(): Promise<string> {
  if (!isRapidGatewayConfigured()) {
    throw new Error("Rapid Gateway not configured — set RAPID_GATEWAY_MERCHANT_ID and RAPID_GATEWAY_SECRET_KEY");
  }

  const credentials = Buffer.from(`${MERCHANT_ID}:${SECRET_KEY}`).toString("base64");

  const response = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Rapid Gateway OAuth failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`Rapid Gateway OAuth error: ${data.error || "no access_token"}`);
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
 * Returns the checkout URL to redirect the customer to.
 *
 * Uses fetch with redirect: "manual" to capture the Location header
 * (Rapid Gateway returns a 302 redirect to the hosted checkout page).
 */
export async function createTransaction(params: TransactionParams): Promise<TransactionResult> {
  const token = await getAccessToken();

  const formData = new URLSearchParams({
    MERCHANT_ID: MERCHANT_ID,
    MERCHANT_NAME: "Playbeat Digital",
    TXNAMT: params.amount.toFixed(2),
    CURRENCY_CODE: params.currency,
    CUSTOMER_MOBILE_NO: params.customerPhone,
    CUSTOMER_EMAIL_ADDRESS: params.customerEmail,
    BASKET_ID: params.orderNumber,
    SUCCESS_URL: `${BASE_URL}/payment/success?order=${params.orderNumber}`,
    FAILURE_URL: `${BASE_URL}/payment/failure?order=${params.orderNumber}`,
    CHECKOUT_URL: `${BASE_URL}/payment/complete?order=${params.orderNumber}`,
    VERSION: "MY_VER_1.0",
    PROCCODE: "0",
  });

  const response = await fetch(TXN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Bearer ${token}`,
    },
    body: formData.toString(),
    redirect: "manual", // capture the 302 Location header
  });

  // Rapid Gateway returns a 302 redirect to the hosted checkout
  const location = response.headers.get("location");
  if (location) {
    return { checkoutUrl: location, merchantTransactionId: params.orderNumber };
  }

  // If no redirect, try to parse JSON response (some integrations return JSON)
  if (response.status >= 200 && response.status < 300) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json.checkoutUrl || json.checkout_url || json.redirectUrl) {
        return {
          checkoutUrl: json.checkoutUrl || json.checkout_url || json.redirectUrl,
          merchantTransactionId: json.merchantTransactionId || params.orderNumber,
        };
      }
    } catch {
      // not JSON
    }
  }

  const errorText = await response.text().catch(() => "unknown");
  throw new Error(`Rapid Gateway transaction failed (${response.status}): ${errorText}`);
}

/**
 * Verify Rapid Gateway webhook signature.
 *
 * Signature = HMAC-SHA256(secret = webhook salt, message = timestamp + "." + rawBody)
 * Encoded as uppercase hex.
 *
 * Rules:
 *   1. Reject if timestamp is more than 5 minutes from now.
 *   2. Recompute HMAC over timestamp + "." + rawBody.
 *   3. Constant-time compare against X-RapidGateway-Signature.
 *
 * @param timestamp - X-RapidGateway-Timestamp header (Unix epoch seconds)
 * @param rawBody - raw request body bytes (NOT re-serialized JSON)
 * @param signature - X-RapidGateway-Signature header (uppercase hex)
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  if (!WEBHOOK_SALT) {
    console.warn("[rapid-gateway] Webhook salt not configured — rejecting all webhooks");
    return false;
  }

  // 1. Check timestamp window (5 minutes = 300 seconds)
  const ts = Number(timestamp);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    console.warn(`[rapid-gateway] Webhook timestamp outside 5-min window: ts=${ts}, now=${now}`);
    return false;
  }

  // 2. Recompute HMAC-SHA256
  const message = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SALT)
    .update(message)
    .digest("hex")
    .toUpperCase();

  // 3. Constant-time compare
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
