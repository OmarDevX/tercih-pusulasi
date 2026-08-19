"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function getId(key: string) {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    localStorage.setItem(key, value);
    return value;
  } catch { return undefined; }
}

export function trackAnalytics(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ...payload,
    sessionId: getId("tp_analytics_session"),
    visitorId: getId("tp_analytics_visitor"),
  });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics/event", new Blob([body], { type: "application/json" }));
  else void fetch("/api/analytics/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
}

function RouteTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    trackAnalytics({ type: "page_view", path: `${pathname}${searchParams.size ? `?${searchParams}` : ""}`, referrer: document.referrer });
  }, [pathname, searchParams]);
  return null;
}

export default function AnalyticsTracker() {
  return <Suspense fallback={null}><RouteTrackerInner /></Suspense>;
}
