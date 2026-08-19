import { getProgramsForUniversity, getResearchForUniversity, RESEARCH_META, UNIVERSITY_NAMES } from "./catalog";
import { normalizeUniversityName } from "./university-utils";
import { DEFAULT_COMPARE_SELECTIONS } from "./routes";
import { getTheSubjectRankings } from "./the-subject-rankings";
import type { TheSubjectRankings } from "./the-subjects";

export type YearCount = { year: number; works_count: number; cited_by_count: number };
export type CompareUniversity = {
  name: string;
  city: string;
  type: string;
  logo: string | null;
  rankings: { urap: number | null; the: string; qs: string };
  subjectRankings: TheSubjectRankings;
  research: null | {
    openAlexId: string;
    matchedName: string;
    established: number | null;
    officialWebsite: string | null;
    worksCount: number;
    citedByCount: number;
    citationsPerWork: number | null;
    hIndex: number | null;
    i10Index: number | null;
    meanCitedness2y: number | null;
    outputGrowth: number | null;
    countsByYear: YearCount[];
  };
  cost: {
    tuitionModel: string;
    housing: string;
    verifiedPrice: number | null;
    note: string;
    officialHousingUrl: string;
  };
};

export type ComparePayload = {
  dataVersion: string;
  universities: CompareUniversity[];
  generatedAt: string;
  researchDataUpdatedAt: string;
  researchCoverage: { matched: number; total: number };
};

export class CompareDataError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export { DEFAULT_COMPARE_SELECTIONS } from "./routes";

export const getComparePayload = async (requestedNames: string[]): Promise<ComparePayload> => {
  const requested = requestedNames.map((name) => name.trim()).filter(Boolean).slice(0, 3);
  if (requested.length < 2) {
    throw new CompareDataError("Karşılaştırmak için en az iki üniversite seç.", 400);
  }
  const unique = [...new Set(requested.map(normalizeUniversityName))];
  if (unique.length !== requested.length) {
    throw new CompareDataError("Aynı üniversite birden fazla seçilemez.", 400);
  }

  const resolved = requested.map((name) =>
    UNIVERSITY_NAMES.find(
      (candidate) => normalizeUniversityName(candidate) === normalizeUniversityName(name),
    ),
  );
  if (resolved.some((name) => !name)) {
    throw new CompareDataError("Seçilen üniversitelerden biri katalogda bulunamadı.", 404);
  }

  const universities = await Promise.all((resolved as string[]).map(async (name): Promise<CompareUniversity> => {
    const first = getProgramsForUniversity(name)[0];
    if (!first) throw new CompareDataError("Üniversite kataloğu bulunamadı.", 404);
    const research = getResearchForUniversity(name);
    return {
      name,
      city: first.city,
      type: first.universityType,
      logo: first.universityLogo,
      rankings: {
        urap: first.urap,
        the: first.the,
        qs: first.qs,
      },
      research,
      subjectRankings: await getTheSubjectRankings(name, research),
      cost: {
        tuitionModel:
          first.universityType === "Devlet"
            ? "Katkı payı; program, uyruk ve öğrenim süresine göre değişebilir"
            : first.universityType === "Vakıf"
              ? "Yıllık öğrenim ücreti burs oranına göre değişir"
              : "Ücret program ve statüye göre değişir",
        housing: "GSB/KYK ve üniversite/özel yurt seçenekleri",
        verifiedPrice: null,
        note: "Üniversite bazında güncel, merkezî ve doğrulanabilir yurt fiyatı bulunmadığı için puana katılmadı.",
        officialHousingUrl: "https://kygm.gsb.gov.tr/Sayfalar/2436/2389/YurtUcretiDepozito",
      },
    };
  }));

  return {
    dataVersion: "2026-08-03.1-subject-rankings",
    universities,
    generatedAt: RESEARCH_META.generatedAt,
    researchDataUpdatedAt: RESEARCH_META.generatedAt,
    researchCoverage: { matched: RESEARCH_META.matched, total: RESEARCH_META.total },
  };
};
