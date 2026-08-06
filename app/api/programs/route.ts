import { trackApi } from "../../lib/analytics/server";
import catalogJson from "./catalog.json";
import quotaByProgramJson from "../../quota-by-program.json";
import type { ProgramTuple } from "../../data";
import { normalizeUniversityName } from "../../university-utils";

const catalog = catalogJson as ProgramTuple[];
const quotaByProgram = quotaByProgramJson as unknown as Record<
  string,
  [number | null, number | null, number | null]
>;
const CHUNK_SIZE = 50;

async function handleGET(request: Request) {
  const url = new URL(request.url);
  const university = url.searchParams.get("university")?.trim() ?? "";
  const ids = new Set(
    (url.searchParams.get("ids") ?? "")
      .split(",")
      .map(Number)
      .filter(Number.isFinite),
  );

  if (ids.size === 0 && !university) {
    return Response.json(
      { error: "En az bir bölüm kimliği veya üniversite adı gerekli." },
      { status: 400 },
    );
  }

  const normalizedUniversity = normalizeUniversityName(university);
  const programs = university
    ? catalog.filter(
        (row) => normalizeUniversityName(row[4]) === normalizedUniversity,
      )
    : catalog.filter((row) => ids.has(row[1]));
  const requestedPage = Number(url.searchParams.get("page") ?? "0");
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const pageCount = Math.ceil(programs.length / CHUNK_SIZE);
  const start = page * CHUNK_SIZE;
  const pagePrograms = programs.slice(start, start + CHUNK_SIZE).map((row) => {
    const quotas = quotaByProgram[row[0]] ?? [null, null, null];
    return [...row.slice(0, 15), ...quotas] as ProgramTuple;
  });

  return Response.json({
    programs: pagePrograms,
    total: programs.length,
    page,
    pageCount,
  }, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: Request) {
  return trackApi(request, "/api/programs", () => handleGET(request));
}
