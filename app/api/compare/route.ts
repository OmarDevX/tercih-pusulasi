import { trackApi } from "../../lib/analytics/server";
import { CompareDataError, getComparePayload } from "../../compare-data";

export const revalidate = 86400;

async function handleGET(request: Request) {
  const url = new URL(request.url);
  try {
    const payload = await getComparePayload(url.searchParams.getAll("university"));
    return Response.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof CompareDataError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Karşılaştırma verisi hazırlanamadı." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return trackApi(request, "/api/compare", () => handleGET(request));
}
