import { trackApi } from "../../lib/analytics/server";
import catalogJson from "../programs/catalog.json";
import type { ProgramTuple } from "../../data";
import { displayUniversityName } from "../../university-utils";

const catalog = catalogJson as ProgramTuple[];
const universities = [...new Set(catalog.map((row) => displayUniversityName(row[4])))]
  .sort((a, b) => a.localeCompare(b, "tr"));

async function handleGET() {
  return Response.json({ universities }, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: Request) {
  return trackApi(request, "/api/universities", () => handleGET());
}
