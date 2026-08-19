import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "app/api/programs/catalog.json");
const manifestPath = path.join(root, "app/university-logos.json");
const outputDir = path.join(root, "public/university-icons");
const commonsApi = "https://commons.wikimedia.org/w/api.php";
const userAgent = "TercihPusulasi/1.0 (university-logo-sync)";

const normalize = (value) =>
  value
    .replace(/^File:/i, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ı", "i")
    .replaceAll("&", " ve ")
    .replace(/\b(logo(?:su)?|logotype|amblem(?:i)?|armasi|emblem|official|new|vector|vektor|of|the)\b/g, " ")
    .replace(/\b(universitesi|universite|university|universitat|universita)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const getJson = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
};

const listCategory = async (category) => {
  const files = [];
  let continuation = {};
  do {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "categorymembers",
      gcmtitle: `Category:${category}`,
      gcmtype: "file",
      gcmlimit: "500",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "320",
      origin: "*",
      ...continuation,
    });
    const data = await getJson(`${commonsApi}?${params}`);
    for (const page of data.query?.pages ?? []) {
      const image = page.imageinfo?.[0];
      if (image?.thumburl || image?.url) {
        files.push({ title: page.title, url: image.thumburl ?? image.url });
      }
    }
    continuation = data.continue ?? null;
  } while (continuation);
  return files;
};

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const universities = new Map();

for (const row of catalog) {
  const id = String(row[0]).slice(0, 4);
  if (!universities.has(id)) universities.set(id, row[4]);
}

await mkdir(outputDir, { recursive: true });

// Keep every reviewed cached logo whose file still exists.
for (const [id, publicPath] of Object.entries(manifest)) {
  try {
    await stat(path.join(root, "public", publicPath.replace(/^\//, "")));
  } catch {
    delete manifest[id];
  }
}

const categories = [
  "Logos of universities and colleges in Turkey",
  "SVG logos of universities and colleges in Turkey",
];
const candidates = (await Promise.all(categories.map(listCategory))).flat();
const candidatesByName = new Map();

for (const candidate of candidates) {
  const key = normalize(candidate.title);
  if (key && !candidatesByName.has(key)) candidatesByName.set(key, candidate);
}

let added = 0;
for (const [id, university] of universities) {
  if (manifest[id]) continue;
  const candidate = candidatesByName.get(normalize(university));
  if (!candidate) continue;

  let response;
  try {
    response = await fetch(candidate.url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    console.warn(`! skipped unavailable image for ${id} ${university}`);
    continue;
  }
  if (!response.ok) continue;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) continue;

  const extension = contentType.includes("jpeg") ? "jpg" : "png";
  const filename = `${id}.${extension}`;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 300) continue;

  await writeFile(path.join(outputDir, filename), bytes);
  manifest[id] = `/university-icons/${filename}`;
  added += 1;
  console.log(`+ ${id} ${university} <- ${candidate.title}`);
}

const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)),
);
await writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);

console.log(
  `Logo sync complete: ${Object.keys(sorted).length}/${universities.size} cached (${added} new).`,
);
