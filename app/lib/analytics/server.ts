import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { AnalyticsEvent, AnalyticsRange } from "./types";

const TABLE = "analytics_events";
const PAGE_SIZE = 1000;
const MAX_EVENTS_PER_READ = 100_000;

function clean(value: string | null | undefined, max = 300) {
  return value?.replace(/[\u0000-\u001f]/g, "").slice(0, max) || undefined;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error(
      "Supabase analytics is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseConfig();
  const authHeaders: Record<string, string> = { apikey: key };

  // New Supabase secret keys (sb_secret_...) are opaque API keys, not JWTs.
  // Sending them as a Bearer token can make PostgREST reject the request.
  // Legacy service-role keys are JWTs and still use the Authorization header.
  if (!key.startsWith("sb_secret_")) {
    authHeaders.Authorization = `Bearer ${key}`;
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Supabase analytics request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return response;
}

function deviceFromUa(ua: string) {
  if (/bot|crawler|spider|slurp/i.test(ua)) return "bot" as const;
  if (/ipad|tablet|kindle/i.test(ua)) return "tablet" as const;
  if (/mobile|iphone|android/i.test(ua)) return "mobile" as const;
  if (ua) return "desktop" as const;
  return "unknown" as const;
}

function browserFromUa(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  return ua ? "Other" : "Unknown";
}

function osFromUa(ua: string) {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export function requestContext(request: Request) {
  const headers = request.headers;
  const ua = headers.get("user-agent") || "";
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const salt = new Date().toISOString().slice(0, 10);
  return {
    country: clean(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"), 80),
    city: clean(headers.get("x-vercel-ip-city") || headers.get("cf-ipcity"), 120),
    device: deviceFromUa(ua),
    browser: browserFromUa(ua),
    os: osFromUa(ua),
    visitorId: forwarded
      ? createHash("sha256").update(`${salt}:${forwarded}`).digest("hex").slice(0, 20)
      : undefined,
  };
}

function toDatabaseRow(event: AnalyticsEvent) {
  return {
    id: event.id,
    event_type: event.type,
    occurred_at: event.timestamp,
    session_id: event.sessionId ?? null,
    visitor_id: event.visitorId ?? null,
    path: event.path ?? null,
    referrer: event.referrer ?? null,
    search_query: event.query ?? null,
    search_kind: event.searchKind ?? null,
    search_result: event.searchResult ?? null,
    endpoint: event.endpoint ?? null,
    method: event.method ?? null,
    status_code: event.status ?? null,
    duration_ms: event.durationMs ?? null,
    country: event.country ?? null,
    city: event.city ?? null,
    device: event.device ?? null,
    browser: event.browser ?? null,
    operating_system: event.os ?? null,
  };
}

type DatabaseRow = ReturnType<typeof toDatabaseRow>;

function fromDatabaseRow(row: DatabaseRow): AnalyticsEvent {
  return {
    id: row.id,
    type: row.event_type,
    timestamp: row.occurred_at,
    sessionId: row.session_id ?? undefined,
    visitorId: row.visitor_id ?? undefined,
    path: row.path ?? undefined,
    referrer: row.referrer ?? undefined,
    query: row.search_query ?? undefined,
    searchKind: row.search_kind ?? undefined,
    searchResult: row.search_result ?? undefined,
    endpoint: row.endpoint ?? undefined,
    method: row.method ?? undefined,
    status: row.status_code ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    device: row.device ?? undefined,
    browser: row.browser ?? undefined,
    os: row.operating_system ?? undefined,
  };
}

export async function recordAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "timestamp"> & Partial<Pick<AnalyticsEvent, "timestamp">>,
) {
  const row: AnalyticsEvent = {
    ...event,
    id: randomUUID(),
    timestamp: event.timestamp || new Date().toISOString(),
    path: clean(event.path, 500),
    referrer: clean(event.referrer, 500),
    query: clean(event.query, 300),
    searchResult: clean(event.searchResult, 300),
    endpoint: clean(event.endpoint, 300),
    sessionId: clean(event.sessionId, 100),
    visitorId: clean(event.visitorId, 100),
  };

  await supabaseRequest(TABLE, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDatabaseRow(row)),
  });
}

export async function readAnalyticsEvents(range: AnalyticsRange) {
  const duration = range === "all" ? null : { "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5, "90d": 90 * 864e5 }[range];
  const cutoff = duration === null ? null : new Date(Date.now() - duration).toISOString();
  const events: AnalyticsEvent[] = [];

  for (let offset = 0; offset < MAX_EVENTS_PER_READ; offset += PAGE_SIZE) {
    const query = new URLSearchParams({
      select: "*",
      order: "occurred_at.desc",
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });
    if (cutoff) query.set("occurred_at", `gte.${cutoff}`);
    const response = await supabaseRequest(`${TABLE}?${query.toString()}`);
    const rows = (await response.json()) as DatabaseRow[];
    events.push(...rows.map(fromDatabaseRow));
    if (rows.length < PAGE_SIZE) break;
  }

  return events;
}

export async function trackApi<T>(request: Request, endpoint: string, handler: () => Promise<T>) {
  const started = performance.now();
  let status = 200;
  try {
    const result = await handler();
    if (result instanceof Response) status = result.status;
    return result;
  } catch (error) {
    status = 500;
    throw error;
  } finally {
    const context = requestContext(request);
    await recordAnalyticsEvent({
      type: "api_call",
      endpoint,
      path: new URL(request.url).pathname,
      method: request.method,
      status,
      durationMs: Math.round(performance.now() - started),
      ...context,
    }).catch(() => undefined);
  }
}
