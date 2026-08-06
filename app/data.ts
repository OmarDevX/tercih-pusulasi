import subjectGroupsJson from "./subject-groups.json";
import qsRankingsJson from "./qs-rankings.json";
import theRankingsJson from "./the-rankings.json";
import universityLogosJson from "./university-logos.json";
import urapRankingsJson from "./urap-rankings.json";
import { cleanUniversityName, titleCase } from "./university-utils";

export type UniversityType = "Devlet" | "Vakıf" | "KKTC" | "Yurtdışı";
export type LocationType = "Türkiye" | "KKTC" | "Yurtdışı";
export type ScholarshipType =
  | "Ücretsiz"
  | "Burslu"
  | "%50 İndirimli"
  | "%25 İndirimli"
  | "Ücretli";
export type ProgramLevel = "Lisans" | "Önlisans";

export type Program = {
  id: string;
  universityLogo: string | null;
  groupId: number;
  subject: string;
  programName: string;
  university: string;
  faculty: string;
  city: string;
  universityType: UniversityType;
  location: LocationType;
  language: string;
  scholarship: ScholarshipType;
  level: ProgramLevel;
  scoreType: string;
  mtok: boolean;
  rank2025: number | null;
  rank2024: number | null;
  quota2026: number | null;
  quota2025: number | null;
  quota2024: number | null;
  urap: number | null;
  the: string;
  qs: string;
};

export type ProgramTuple = [
  id: string,
  groupId: number,
  subject: string,
  programName: string,
  university: string,
  faculty: string,
  city: string | null,
  universityType: "DEVLET" | "VAKIF" | "KKTC" | "YURTDISI KAMU" | "YURTDISI VAKIF",
  language: string,
  scholarship: ScholarshipType,
  level: "LISANS" | "ÖNLISANS",
  scoreType: string | null,
  rank2025: number | null,
  rank2024: number | null,
  mtok: boolean,
  quota2024: number | null,
  quota2025: number | null,
  quota2026: number | null,
];

export type SubjectGroup = {
  name: string;
  ids: number[];
  scoreTypes: string[];
};

const urapRankings = urapRankingsJson as Record<string, number>;
const theRankings = theRankingsJson as Record<string, string>;
const qsRankings = qsRankingsJson as Record<string, string>;
const universityLogos = universityLogosJson as Record<string, string>;

export const SUBJECT_GROUPS = subjectGroupsJson as SubjectGroup[];
export const SUBJECTS = SUBJECT_GROUPS.map((group) => group.name);
export const CATALOG_STATS = {
  programs: 21_493,
  universities: 228,
  subjects: SUBJECT_GROUPS.length,
};

export const SCHOLARSHIP_OPTIONS: ScholarshipType[] = [
  "Burslu",
  "%50 İndirimli",
  "%25 İndirimli",
  "Ücretli",
];

const mapUniversityType = (value: ProgramTuple[7]): UniversityType => {
  if (value === "DEVLET") return "Devlet";
  if (value === "VAKIF") return "Vakıf";
  if (value === "KKTC") return "KKTC";
  return "Yurtdışı";
};

export const programFromTuple = (row: ProgramTuple): Program => {
  const university = cleanUniversityName(row[4]);
  const universityType = mapUniversityType(row[7]);
  const location: LocationType =
    universityType === "KKTC"
      ? "KKTC"
      : universityType === "Yurtdışı"
        ? "Yurtdışı"
        : "Türkiye";
  return {
    id: row[0],
    universityLogo: universityLogos[row[0].slice(0, 4)] ?? null,
    groupId: row[1],
    subject: row[2],
    programName: row[3],
    university: titleCase(university),
    faculty: titleCase(row[5]),
    city: titleCase(row[6] ?? "Belirtilmedi"),
    universityType,
    location,
    language: row[8],
    scholarship: row[9],
    level: row[10] === "ÖNLISANS" ? "Önlisans" : "Lisans",
    scoreType: row[11] ?? "—",
    rank2025: row[12],
    rank2024: row[13],
    quota2024: row[15],
    quota2025: row[16],
    quota2026: row[17],
    mtok: row[14],
    urap: urapRankings[university] ?? null,
    the: theRankings[university] ?? "Listelenmedi",
    qs: qsRankings[university] ?? "Listelenmedi",
  };
};
