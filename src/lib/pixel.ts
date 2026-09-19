// Meta Pixel (Facebook Pixel) tracking utilities
// Pixel ID: 1052867624415243
// Provides both client-side (fbq) helpers and a server-side Conversions API (CAPI) bridge.

export const META_PIXEL_ID = "1052867624415243";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

type MetaEventName = "PageView" | "Lead" | "Purchase" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "CompleteRegistration";

/** Fire a client-side Meta Pixel event. Safe to call during SSR (no-op). */
export function trackMetaEvent(eventName: MetaEventName, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined") return;
  if (!window.fbq) return;
  if (eventId) {
    window.fbq("track", eventName, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", eventName, params ?? {});
  }
}

/** Fire a PageView (also dedupes with server-side via eventId). */
export function trackPageView(eventId?: string) {
  trackMetaEvent("PageView", undefined, eventId);
}

/**
 * Send an event to the server-side Meta Conversions API (CAPI) bridge.
 * This dedupes with the client-side pixel using the same eventID.
 */
export async function trackServerSide(
  eventName: MetaEventName,
  payload: { value?: number; currency?: string; email?: string; phone?: string; eventId?: string }
) {
  try {
    await fetch("/api/pixel/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, ...payload }),
    });
  } catch {
    // best-effort, never block UX
  }
}

/** Track a Lead event end-to-end (client + server) with dedup. */
export function trackLead(value: number, currency: string, email?: string, phone?: string) {
  const eventId = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  trackMetaEvent("Lead", { value, currency, content_name: "Lead Created" }, eventId);
  void trackServerSide("Lead", { value, currency, email, phone, eventId });
}
