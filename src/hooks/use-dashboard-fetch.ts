"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/store";

/**
 * Generic fetch hook tied to the dashboard refreshKey so mutations
 * anywhere in the app trigger a refetch.
 */
export function useDashboardFetch<T>(url: string): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const refreshKey = useDashboard((s) => s.refreshKey);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setData(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [url, refreshKey]);

  return { data, loading, error, refetch: fetchData };
}
