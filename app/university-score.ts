export const MISSING_RANKING_POINTS = 5;

export type AcademicUniversity = {
  rankings: { urap: number | null; the: string; qs: string };
  research: null | {
    worksCount: number;
    citationsPerWork: number | null;
    hIndex: number | null;
    meanCitedness2y: number | null;
    outputGrowth: number | null;
  };
};

export type AcademicScore = {
  points: number;
  rankingPoints: number | null;
  researchPoints: number | null;
  trendPoints: number | null;
};

const bandPoints = (value: string) => {
  if (!value || value === "Listelenmedi") return MISSING_RANKING_POINTS;
  const rank = Number(value.replace(/[=+]/g, "").match(/\d+/)?.[0]);
  if (!Number.isFinite(rank)) return MISSING_RANKING_POINTS;
  if (rank <= 100) return 100;
  if (rank <= 200) return 90;
  if (rank <= 300) return 80;
  if (rank <= 500) return 70;
  if (rank <= 800) return 55;
  if (rank <= 1000) return 42;
  if (rank <= 1500) return 27;
  return 15;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export const scoreUniversities = <T extends AcademicUniversity>(universities: T[]): Array<T & AcademicScore> => {
  const maxWorks = Math.max(...universities.map((item) => item.research?.worksCount ?? 0), 1);
  const maxH = Math.max(...universities.map((item) => item.research?.hIndex ?? 0), 1);
  const maxCitations = Math.max(...universities.map((item) => item.research?.citationsPerWork ?? 0), 1);
  const maxRecentImpact = Math.max(...universities.map((item) => item.research?.meanCitedness2y ?? 0), 1);

  return universities.map((university) => {
    const urapPoints = university.rankings.urap === null
      ? MISSING_RANKING_POINTS
      : clamp(100 - ((university.rankings.urap - 1) / 197) * 100);
    const rankingPoints = urapPoints * 0.5
      + bandPoints(university.rankings.the) * 0.25
      + bandPoints(university.rankings.qs) * 0.25;

    const researchPoints = university.research
      ? (university.research.hIndex ?? 0) / maxH * 40
        + (university.research.citationsPerWork ?? 0) / maxCitations * 20
        + (university.research.meanCitedness2y ?? 0) / maxRecentImpact * 20
        + Math.log1p(university.research.worksCount) / Math.log1p(maxWorks) * 20
      : null;
    const trendPoints = university.research?.outputGrowth === null || university.research?.outputGrowth === undefined
      ? null
      : clamp(50 + university.research.outputGrowth * 1.5);

    const components = [
      rankingPoints === null ? null : { score: rankingPoints, weight: 55 },
      researchPoints === null ? null : { score: researchPoints, weight: 35 },
      trendPoints === null ? null : { score: trendPoints, weight: 10 },
    ].filter((value): value is { score: number; weight: number } => value !== null);
    const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
    const points = totalWeight
      ? components.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight
      : 0;

    return { ...university, points, rankingPoints, researchPoints, trendPoints };
  });
};
