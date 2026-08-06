export type AnalyticsEventType = "page_view" | "search" | "api_call";

export type AnalyticsEvent = {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  sessionId?: string;
  visitorId?: string;
  path?: string;
  referrer?: string;
  query?: string;
  searchKind?: "university" | "subject" | "unknown";
  searchResult?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  country?: string;
  city?: string;
  device?: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser?: string;
  os?: string;
};

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "all";
