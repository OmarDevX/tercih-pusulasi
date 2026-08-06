import { readFile, writeFile } from "node:fs/promises";
import catalog from "../app/api/programs/catalog.json" with { type: "json" };

const clean = (value) => value.replace(/\s+\([^)]*\)\s*$/, "").trim();
const searchAliases = {
  "ULUSLARARASI SARAYBOSNA ÜNİVERSİTESİ": "International University of Sarajevo",
  "DEMİROĞLU BİLİM ÜNİVERSİTESİ": "Istanbul Bilim University",
  "AZERBAYCAN DEVLET PEDAGOJİ ÜNİVERSİTESİ": "Azerbaijan State Pedagogical University",
};
const normalize = (value) => clean(value)
  .toLocaleLowerCase("tr-TR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replaceAll("ı", "i")
  .replace(/\b(universitesi|universite|university|enstitusu|institute|of|the)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const similarity = (target, candidate) => {
  const left = normalize(target);
  const right = normalize(candidate);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 80;
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size, 1) * 60;
};

const getJson = async (url, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "TercihPusulasi/1.0 (research snapshot)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) return await response.json();
    } catch {
      // Retry transient network failures.
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return null;
};

const fetchCountryInstitutions = async (countryCode) => {
  const institutions = [];
  let cursor = "*";
  do {
    const params = new URLSearchParams({
      filter: `country_code:${countryCode}`,
      "per-page": "200",
      cursor,
    });
    const payload = await getJson(`https://api.openalex.org/institutions?${params}`);
    institutions.push(...(payload?.results ?? []));
    cursor = payload?.meta?.next_cursor ?? "";
  } while (cursor);
  return institutions;
};

const scoreCandidate = (university, candidate) => Math.max(
  similarity(university, candidate.display_name),
  ...(candidate.display_name_alternatives ?? []).map((name) => similarity(university, name)),
);

const compact = (institution, established, officialWebsite) => {
  const countsByYear = (institution.counts_by_year ?? [])
    .filter((item) => item.year >= 2021 && item.year <= 2025)
    .sort((a, b) => a.year - b.year)
    .map(({ year, works_count, cited_by_count }) => ({ year, works_count, cited_by_count }));
  const first = countsByYear[0];
  const last = countsByYear.at(-1);
  return {
    openAlexId: institution.id,
    matchedName: institution.display_name,
    established,
    officialWebsite: officialWebsite ?? institution.homepage_url ?? null,
    worksCount: institution.works_count ?? 0,
    citedByCount: institution.cited_by_count ?? 0,
    citationsPerWork: institution.works_count > 0
      ? institution.cited_by_count / institution.works_count
      : null,
    hIndex: institution.summary_stats?.h_index ?? null,
    i10Index: institution.summary_stats?.i10_index ?? null,
    meanCitedness2y: institution.summary_stats?.["2yr_mean_citedness"] ?? null,
    outputGrowth: first && last && first.works_count > 0
      ? ((last.works_count - first.works_count) / first.works_count) * 100
      : null,
    countsByYear,
  };
};

const allUniversities = [...new Map(
  catalog.map((row) => [clean(row[4]), clean(row[4])]),
).values()];
const aliasesOnly = process.argv.includes("--aliases-only");
const uniqueUniversities = aliasesOnly ? Object.keys(searchAliases) : allUniversities;

const countryInstitutions = aliasesOnly ? [] : [
  ...await fetchCountryInstitutions("TR"),
  ...await fetchCountryInstitutions("CY"),
];

const matches = new Map();
for (const university of uniqueUniversities) {
  const best = countryInstitutions
    .map((candidate) => ({ candidate, score: scoreCandidate(university, candidate) }))
    .sort((a, b) => b.score - a.score)[0];
  if (best?.score >= 42) matches.set(university, best.candidate);
}

const unresolved = uniqueUniversities.filter((university) => !matches.has(university));
for (let index = 0; index < unresolved.length; index += 8) {
  const batch = unresolved.slice(index, index + 8);
  const results = await Promise.all(batch.map(async (university) => {
    const query = searchAliases[university] ?? university;
    const params = new URLSearchParams({ search: query, "per-page": "5" });
    const payload = await getJson(`https://api.openalex.org/institutions?${params}`);
    const best = (payload?.results ?? [])
      .map((candidate) => ({ candidate, score: scoreCandidate(query, candidate) }))
      .sort((a, b) => b.score - a.score)[0];
    return best?.score >= 42 ? [university, best.candidate] : null;
  }));
  for (const result of results) if (result) matches.set(result[0], result[1]);
}

const rorDetails = new Map();
const matchedEntries = [...matches.entries()];
for (let index = 0; index < matchedEntries.length; index += 10) {
  const batch = matchedEntries.slice(index, index + 10);
  await Promise.all(batch.map(async ([, institution]) => {
    const rorId = institution.ror?.split("/").pop();
    if (!rorId || rorDetails.has(rorId)) return;
    const payload = await getJson(`https://api.ror.org/v2/organizations/${rorId}`, 1);
    rorDetails.set(rorId, {
      established: payload?.established ?? null,
      officialWebsite: payload?.links?.find((link) => link.type === "website")?.value ?? null,
    });
  }));
}

const outputUrl = new URL("../app/university-research.json", import.meta.url);
const previous = aliasesOnly
  ? JSON.parse(await readFile(outputUrl, "utf8"))
  : { universities: {} };
const data = { ...previous.universities };
for (const [university, institution] of matchedEntries) {
  const rorId = institution.ror?.split("/").pop();
  const ror = rorId ? rorDetails.get(rorId) : null;
  data[university] = compact(institution, ror?.established ?? null, ror?.officialWebsite ?? null);
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "OpenAlex + ROR",
  matched: Object.keys(data).length,
  total: allUniversities.length,
  universities: data,
};

await writeFile(outputUrl, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Research snapshot written: ${output.matched}/${output.total} universities matched.`);
