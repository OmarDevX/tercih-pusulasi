import { getProgramById, getResearchForUniversity } from "../../../catalog";
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

  const sortedProgramIds = [...programs]
    .sort((a, b) => {
      const scoreDifference = (scores[b.university] ?? 0) - (scores[a.university] ?? 0);
      if (Math.abs(scoreDifference) > 0.0001) return scoreDifference;
      if (a.rank2025 !== null && b.rank2025 !== null && a.rank2025 !== b.rank2025) return a.rank2025 - b.rank2025;
      if (a.rank2025 === null && b.rank2025 !== null) return 1;
      if (a.rank2025 !== null && b.rank2025 === null) return -1;
      return (originalPosition.get(a.id) ?? 0) - (originalPosition.get(b.id) ?? 0);
    })
    .map((program) => program.id);

  return Response.json({ sortedProgramIds, scores }, {
    headers: { "Cache-Control": "no-store" },
  });
}
