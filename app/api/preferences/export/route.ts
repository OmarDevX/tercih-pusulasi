import { getProgramById } from "../../../catalog";
import {
  getOsymProgramTraits,
  OSYM_GUIDE_SOURCE_DATE,
  OSYM_GUIDE_SOURCE_NAME,
  OSYM_GUIDE_SOURCE_URL,
} from "../../../osym-traits";

const MAX_PROGRAMS = 200;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const rawIds =
    body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
      ? (body as { ids: unknown[] }).ids
      : [];

  if (rawIds.length > MAX_PROGRAMS) {
    return Response.json(
      { error: `Tek PDF raporunda en fazla ${MAX_PROGRAMS} program olabilir.` },
      { status: 400 },
    );
  }

  const ids = rawIds.filter((id): id is string => typeof id === "string");

  if (ids.length === 0) {
    return Response.json({ error: "PDF için en az bir program gerekli." }, { status: 400 });
  }

  const programs = ids
    .map((id) => getProgramById(id))
    .filter((program): program is NonNullable<typeof program> => Boolean(program));

  if (programs.length === 0) {
    return Response.json({ error: "Programlar bulunamadı." }, { status: 404 });
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      osymGuide: {
        name: OSYM_GUIDE_SOURCE_NAME,
        date: OSYM_GUIDE_SOURCE_DATE,
        url: OSYM_GUIDE_SOURCE_URL,
      },
      programs: programs.map((program) => ({
        ...program,
        traits: getOsymProgramTraits(program),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
