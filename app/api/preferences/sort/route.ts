import { getProgramById, getResearchForUniversity } from "../../../catalog";
import { getYokAtlas2026Ranks } from "../../../lib/yokatlas-2026";
import { scoreUniversities } from "../../../university-score";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const programIds = body && typeof body === "object" && Array.isArray((body as { programIds?: unknown }).programIds)
    ? (body as { programIds: unknown[] }).programIds.filter((id): id is string => typeof id === "string").slice(0, 100)
    : [];
  if (programIds.length === 0) {
    return Response.json({ error: "Sıralanacak tercih bulunamadı." }, { status: 400 });
  }

  const programs = programIds.map(getProgramById).filter((program) => program !== undefined);
  if (programs.length !== programIds.length) {
    return Response.json({ error: "Tercihlerden biri katalogda bulunamadı." }, { status: 404 });
  }

  const universityRows = [...new Map(programs.map((program) => [program.university, program])).values()]
    .map((program) => ({
      name: program.university,
      rankings: { urap: program.urap, the: program.the, qs: program.qs },
      research: getResearchForUniversity(program.university),
    }));
  const scored = scoreUniversities(universityRows);
  const scores = Object.fromEntries(scored.map((university) => [university.name, university.points]));
  const originalPosition = new Map(programIds.map((id, index) => [id, index]));
  const rank2026 = await getYokAtlas2026Ranks({
    groupIds: [...new Set(programs.map((program) => program.groupId))],
  });

  const currentRank = (program: (typeof programs)[number]) => rank2026.get(program.id) ?? program.rank2025;

  const sortedProgramIds = [...programs]
    .sort((a, b) => {
      const scoreDifference = (scores[b.university] ?? 0) - (scores[a.university] ?? 0);
      if (Math.abs(scoreDifference) > 0.0001) return scoreDifference;
      const aRank = currentRank(a);
      const bRank = currentRank(b);
      if (aRank !== null && bRank !== null && aRank !== bRank) return aRank - bRank;
      if (aRank === null && bRank !== null) return 1;
      if (aRank !== null && bRank === null) return -1;
      return (originalPosition.get(a.id) ?? 0) - (originalPosition.get(b.id) ?? 0);
    })
    .map((program) => program.id);

  return Response.json({ sortedProgramIds, scores }, {
    headers: { "Cache-Control": "no-store" },
  });
}
