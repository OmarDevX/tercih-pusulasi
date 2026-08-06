import { slugify } from "./slug";
import { normalizeUniversityName } from "./university-utils";
import type { ResearchRecord } from "./catalog";
import { THE_SUBJECTS, type TheSubjectKey, type TheSubjectRankings } from "./the-subjects";

const EMPTY_SUBJECT_RANKINGS = Object.fromEntries(
  THE_SUBJECTS.map(([key]) => [key, "Listelenmedi"]),
) as TheSubjectRankings;

const PROFILE_ALIASES = new Map([
  [normalizeUniversityName("Sağlık Bilimleri Üniversitesi"), "university-health-sciences-turkey"],
  [normalizeUniversityName("T.C. Demiroğlu Bilim Üniversitesi"), "t-c-demiroglu-bilim-university"],
  [normalizeUniversityName("Bezm-i Âlem Vakıf Üniversitesi"), "bezmialem-vakif-university"],
]);

const SUBJECT_PATTERNS: Array<[TheSubjectKey, RegExp[]]> = [
  ["engineering", [/Engineering\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["medicalHealth", [/(?:Medical and Health|Clinical and Health)\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["computerScience", [/Computer Science\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["lifeSciences", [/Life Sciences\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["physicalSciences", [/Physical Sciences\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["businessEconomics", [/Business and Economics\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["artsHumanities", [/Arts and Humanities\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["education", [/Education Studies\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["law", [/Law\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["psychology", [/Psychology\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
  ["socialSciences", [/Social Sciences\s*2026\s*([=]?\d{1,4}(?:\s*[–-]\s*\d{1,4})?\+?)/i]],
];

const htmlToText = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&ndash;|&#8211;|&#x2013;/gi, "–")
  .replace(/&amp;/gi, "&")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/\s+/g, " ");

const normalizeRank = (value: string) => value.replace(/\s+/g, "").replace(/-/g, "–");

export const extractTheSubjectRankings = (html: string): TheSubjectRankings => {
  const text = htmlToText(html);
  const rankings = { ...EMPTY_SUBJECT_RANKINGS };
  for (const [key, patterns] of SUBJECT_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        rankings[key] = normalizeRank(match[1]);
        break;
      }
    }
  }
  return rankings;
};

export const getTheSubjectRankings = async (
  universityName: string,
  research: ResearchRecord | null,
): Promise<TheSubjectRankings> => {
  const profileName = research?.matchedName || universityName;
  const profileSlug = PROFILE_ALIASES.get(normalizeUniversityName(universityName)) ?? slugify(profileName);
  try {
    const response = await fetch(
      `https://www.timeshighereducation.com/world-university-rankings/${profileSlug}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TercihPusulasi/1.0)" },
        next: { revalidate: 604800 },
        signal: AbortSignal.timeout(3500),
      },
    );
    if (!response.ok) return { ...EMPTY_SUBJECT_RANKINGS };
    return extractTheSubjectRankings(await response.text());
  } catch {
    return { ...EMPTY_SUBJECT_RANKINGS };
  }
};
