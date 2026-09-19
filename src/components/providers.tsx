"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Client-side providers wrapper for the root layout.
 * SessionProvider from next-auth/react is client-only — wrap it here so the
 * server-component root layout can use it cleanly.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
