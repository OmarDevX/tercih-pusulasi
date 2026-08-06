import catalogJson from "./api/programs/catalog.json";
import quotaByProgramJson from "./quota-by-program.json";
import researchSnapshotJson from "./university-research.json";
import type { Program, ProgramTuple, SubjectGroup } from "./data";
import { programFromTuple, SUBJECT_GROUPS } from "./data";
import {
  cleanUniversityName,
  displayUniversityName,
  normalizeUniversityName,
} from "./university-utils";
import { slugify } from "./slug";

export type YearCount = { year: number; works_count: number; cited_by_count: number };
export type ResearchRecord = {
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

type ResearchSnapshot = {
  generatedAt: string;
  source: string;
  matched: number;
  total: number;
  universities: Record<string, ResearchRecord>;
};

const catalog = catalogJson as ProgramTuple[];
const quotaByProgram = quotaByProgramJson as unknown as Record<
  string,
  [number | null, number | null, number | null]
>;
const researchSnapshot = researchSnapshotJson as ResearchSnapshot;
const researchIndex = new Map(
  Object.entries(researchSnapshot.universities).map(([name, record]) => [
    normalizeUniversityName(name),
    record,
  ]),
);

const withQuota = (row: ProgramTuple): ProgramTuple => {
  const quotas = quotaByProgram[row[0]] ?? [null, null, null];
  return [...row.slice(0, 15), ...quotas] as ProgramTuple;
};

export const ALL_PROGRAM_TUPLES = catalog.map(withQuota);
export const ALL_PROGRAMS = ALL_PROGRAM_TUPLES.map(programFromTuple);

const tuplesByGroupId = new Map<number, ProgramTuple[]>();
for (const tuple of ALL_PROGRAM_TUPLES) {
  const rows = tuplesByGroupId.get(tuple[1]) ?? [];
  rows.push(tuple);
  tuplesByGroupId.set(tuple[1], rows);
}

const programsByUniversity = new Map<string, Program[]>();
const tuplesByUniversity = new Map<string, ProgramTuple[]>();
for (let index = 0; index < ALL_PROGRAMS.length; index += 1) {
  const program = ALL_PROGRAMS[index];
  const tuple = ALL_PROGRAM_TUPLES[index];
  const key = normalizeUniversityName(program.university);

  const programRows = programsByUniversity.get(key) ?? [];
  programRows.push(program);
  programsByUniversity.set(key, programRows);

  const tupleRows = tuplesByUniversity.get(key) ?? [];
  tupleRows.push(tuple);
  tuplesByUniversity.set(key, tupleRows);
}

export const UNIVERSITY_NAMES = [
  ...new Set(catalog.map((row) => displayUniversityName(row[4]))),
].sort((a, b) => a.localeCompare(b, "tr"));

const subjectBySlug = new Map(SUBJECT_GROUPS.map((group) => [slugify(group.name), group]));
const universityBySlug = new Map(UNIVERSITY_NAMES.map((name) => [slugify(name), name]));
const programById = new Map(ALL_PROGRAMS.map((program) => [program.id, program]));

export const getSubjectBySlug = (slug: string) => subjectBySlug.get(slug);
export const getUniversityBySlug = (slug: string) => universityBySlug.get(slug);
export const getProgramById = (id: string) => programById.get(id);

export const getProgramTuplesForSubject = (group: SubjectGroup) =>
  group.ids.flatMap((id) => tuplesByGroupId.get(id) ?? []);

export const getProgramsForSubject = (group: SubjectGroup) =>
  getProgramTuplesForSubject(group)
    .map(programFromTuple)
    .sort((a, b) => {
      if (a.rank2025 === null && b.rank2025 === null) return a.university.localeCompare(b.university, "tr");
      if (a.rank2025 === null) return 1;
      if (b.rank2025 === null) return -1;
      return a.rank2025 - b.rank2025 || a.university.localeCompare(b.university, "tr");
    });

export const getProgramTuplesForUniversity = (university: string) => {
  const normalized = normalizeUniversityName(university);
  return [...(tuplesByUniversity.get(normalized) ?? [])];
};

export const getProgramsForUniversity = (university: string) => {
  const normalized = normalizeUniversityName(university);
  return [...(programsByUniversity.get(normalized) ?? [])].sort((a, b) => {
    if (a.rank2025 === null && b.rank2025 === null) return a.programName.localeCompare(b.programName, "tr");
    if (a.rank2025 === null) return 1;
    if (b.rank2025 === null) return -1;
    return a.rank2025 - b.rank2025 || a.programName.localeCompare(b.programName, "tr");
  });
};

export const getResearchForUniversity = (university: string) =>
  researchIndex.get(normalizeUniversityName(cleanUniversityName(university))) ?? null;

export const RESEARCH_META = {
  generatedAt: researchSnapshot.generatedAt,
  source: researchSnapshot.source,
  matched: researchSnapshot.matched,
  total: researchSnapshot.total,
};

export const subjectPath = (group: SubjectGroup | string) =>
  `/bolum/${slugify(typeof group === "string" ? group : group.name)}`;
export const universityPath = (university: string) =>
  `/universite/${slugify(university)}`;
export const programPath = (program: Pick<Program, "id" | "programName">) =>
  `/program/${program.id}-${slugify(program.programName)}`;
