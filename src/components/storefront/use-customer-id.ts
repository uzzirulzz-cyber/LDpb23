"use client";

import { useEffect, useState } from "react";

/**
 * useCustomerId — reads/writes localStorage `playbeat_customer_id`.
 * Generates `cust_<random>` if none. Used as the storefront cart identity
 * for guest shoppers before they sign in. SSR-safe (returns null on first paint).
 */
const KEY = "playbeat_customer_id";

function generateId(): string {
  let rand: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    rand = crypto.randomUUID();
  } else {
    rand = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return `cust_${rand}`;
}

export function useCustomerId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const init = () => {
      try {
        let v = window.localStorage.getItem(KEY);
        if (!v) {
          v = generateId();
          window.localStorage.setItem(KEY, v);
        }
        setId(v);
      } catch {
        // localStorage unavailable (private mode etc.) — keep null, cart will
        // still work via server-side auto-create using whatever id we pass.
      }
    };
    init();
  }, []);

  return id;
}

/** Imperative getter for non-hook contexts. */
export function getCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v = generateId();
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}
