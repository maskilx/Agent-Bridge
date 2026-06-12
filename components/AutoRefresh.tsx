"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls the server for fresh data so session timelines feel live. */
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
