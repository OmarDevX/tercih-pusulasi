import { recordAnalyticsEvent, requestContext } from "../../../lib/analytics/server";
import type { AnalyticsEventType } from "../../../lib/analytics/types";

const TYPES = new Set<AnalyticsEventType>(["page_view", "search"]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!TYPES.has(body.type as AnalyticsEventType)) return new Response(null, { status: 400 });
    const context = requestContext(request);
    await recordAnalyticsEvent({
      ...context,
      type: body.type as AnalyticsEventType,
      path: typeof body.path === "string" ? body.path : undefined,
      referrer: typeof body.referrer === "string" ? body.referrer : undefined,
      query: typeof body.query === "string" ? body.query : undefined,
      searchKind: body.searchKind === "university" || body.searchKind === "subject" ? body.searchKind : "unknown",
      searchResult: typeof body.searchResult === "string" ? body.searchResult : undefined,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      visitorId: typeof body.visitorId === "string" ? body.visitorId : context.visitorId,
    });
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 400 }); }
}
