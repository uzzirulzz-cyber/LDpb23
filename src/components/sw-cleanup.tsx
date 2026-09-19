"use client";

import { useEffect } from "react";

/**
 * Unregisters any stale service workers from previous deployments.
 * This fixes the "You're offline" error caused by cached old app versions.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          console.log("[sw-cleanup] Unregistering stale service worker:", reg.scope);
          reg.unregister();
        });
      }).catch(() => {});
    }
  }, []);
  return null;
}
