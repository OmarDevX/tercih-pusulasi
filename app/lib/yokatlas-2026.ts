import { normalizeUniversityName } from "../university-utils";

const YOK_ATLAS_BASE_URL = "https://yokatlas.yok.gov.tr";
const SEARCH_URL = `${YOK_ATLAS_BASE_URL}/api/tercih-kilavuz/search`;
const UNIVERSITIES_URL = `${YOK_ATLAS_BASE_URL}/api/tercih-kilavuz/universiteler`;
const CACHE_TTL_MS = 60 * 60 * 1000;
const PAGE_SIZE = 500;
const MAX_PAGES = 80;

type YokAtlasRow = {
  yil?: number | string | null;
  kilavuzKodu?: number | string | null;
  basariSirasi?: number | string | null;
};

type YokAtlasPage = {
  content?: YokAtlasRow[];
  totalPages?: number;
  yil?: number | string | null;
};

type YokAtlasUniversity = {
  universiteId?: number | string | null;
  universiteAdi?: string | null;
};

type RankQuery =
  | { groupIds: number[] }
  | { university: string };

type CachedRanks = {
  expiresAt: number;
  promise: Promise<Map<string, number | null>>;
};

const rankCache = new Map<string, CachedRanks>();
let universityCache: { expiresAt: number; promise: Promise<YokAtlasUniversity[]> } | null = null;

const asNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const baseFilters = () => ({
  puanTuru: null,
  universiteId: [] as number[],
  birimGrupId: [] as number[],
  ilKodu: [] as number[],
  birimTuruId: null,
  universiteTuru: null,
  bursOraniId: null,
  ogrenimTuruId: null,
  kilavuzKodu: null,
  minBasariSirasi: null,
  maxBasariSirasi: null,
});

const postSearch = async (filters: ReturnType<typeof baseFilters>, page: number): Promise<YokAtlasPage> => {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Tercih-Pusulasi/2026",
    },
    body: JSON.stringify({
      filters,
      page,
      size: PAGE_SIZE,
      sortBy: "basariSirasi",
      direction: "ASC",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`YÖK Atlas returned ${response.status}`);
  return response.json() as Promise<YokAtlasPage>;
};

const getUniversities = async (): Promise<YokAtlasUniversity[]> => {
  const now = Date.now();
  if (universityCache && universityCache.expiresAt > now) return universityCache.promise;

  const promise = fetch(UNIVERSITIES_URL, {
    headers: { Accept: "application/json", "User-Agent": "Tercih-Pusulasi/2026" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`YÖK Atlas universities returned ${response.status}`);
    return response.json() as Promise<YokAtlasUniversity[]>;
  });

  universityCache = { expiresAt: now + CACHE_TTL_MS, promise };
  promise.catch(() => {
    if (universityCache?.promise === promise) universityCache = null;
  });
  return promise;
};

const resolveUniversityId = async (university: string): Promise<number | null> => {
  const normalized = normalizeUniversityName(university);
  const rows = await getUniversities();
  const match = rows.find((row) =>
    typeof row.universiteAdi === "string" && normalizeUniversityName(row.universiteAdi) === normalized,
  );
  return asNumber(match?.universiteId);
};

const fetchRanks = async (query: RankQuery): Promise<Map<string, number | null>> => {
  const filters = baseFilters();
  if ("groupIds" in query) {
    filters.birimGrupId = [...new Set(query.groupIds.filter(Number.isFinite))];
    if (filters.birimGrupId.length === 0) return new Map();
  } else {
    const universityId = await resolveUniversityId(query.university);
    if (universityId === null) return new Map();
    filters.universiteId = [universityId];
  }

  const ranks = new Map<string, number | null>();
  let page = 0;
  let totalPages = 1;

  do {
    const payload = await postSearch(filters, page);
    const pageYear = asNumber(payload.yil);
    for (const row of payload.content ?? []) {
      const rowYear = asNumber(row.yil) ?? pageYear;
      if (rowYear !== 2026) continue;
      const code = asNumber(row.kilavuzKodu);
      if (code === null) continue;
      ranks.set(String(Math.trunc(code)), asNumber(row.basariSirasi));
    }

    const parsedPages = asNumber(payload.totalPages);
    totalPages = parsedPages === null ? 1 : Math.max(1, Math.min(MAX_PAGES, Math.trunc(parsedPages)));
    page += 1;
  } while (page < totalPages);

  return ranks;
};

export const getYokAtlas2026Ranks = async (query: RankQuery): Promise<Map<string, number | null>> => {
  const key = "groupIds" in query
    ? `g:${[...new Set(query.groupIds)].sort((a, b) => a - b).join(",")}`
    : `u:${normalizeUniversityName(query.university)}`;
  const now = Date.now();
  const cached = rankCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = fetchRanks(query);
  rankCache.set(key, { expiresAt: now + CACHE_TTL_MS, promise });
  try {
    return await promise;
  } catch {
    const current = rankCache.get(key);
    if (current?.promise === promise) rankCache.delete(key);
    return new Map<string, number | null>();
  }
};
