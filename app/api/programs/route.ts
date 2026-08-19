import { trackApi } from "../../lib/analytics/server";
import { getYokAtlas2026Ranks } from "../../lib/yokatlas-2026";
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

  const rank2026 = university
    ? await getYokAtlas2026Ranks({ university })
    : await getYokAtlas2026Ranks({ groupIds: [...ids] });

  const pagePrograms = programs.slice(start, start + CHUNK_SIZE).map((row): ProgramTuple => {
    const quotas = quotaByProgram[row[0]] ?? [null, null, null];
    return [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
      row[10],
      row[11],
      row[12],
      row[13],
      row[14],
      quotas[0],
      quotas[1],
      quotas[2],
      rank2026.get(row[0]) ?? null,
    ];
  });

  return Response.json({
    programs: pagePrograms,
    total: programs.length,
    page,
    pageCount,
    dataYear: 2026,
  }, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=21600",
    },
  });
}

export async function GET(request: Request) {
  return trackApi(request, "/api/programs", () => handleGET(request));
}
