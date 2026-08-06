import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};
const ctx = { waitUntil() {}, passThroughOnException() {} };

test("homepage renders searchable catalog content and SEO metadata", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env,
    ctx,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /YKS Tercih Pusulası/i);
  assert.match(html, /Elektrik-Elektronik Mühendisliği/i);
  assert.match(html, /application\/ld\+json/i);
  assert.match(html, /Tercih Listem/i);
  assert.doesNotMatch(html, /codex-preview/i);
});

test("robots exposes the sitemap and blocks API crawling", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(new Request("http://localhost/robots.txt"), env, ctx);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /Disallow:\s*\/api\//i);
  assert.match(body, /Sitemap:.*\/sitemap\.xml/i);
});

test("permanent subject route reuses the full catalog interface", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/bolum/azerbaycan-turkcesi-ve-edebiyati", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Bölüm rehberi:/i);
  assert.match(html, /Azerbaycan Türkçesi ve Edebiyatı/i);
  assert.match(html, /program-card/i);
  assert.match(html, /2026 kılavuz/i);
  assert.match(html, /Tercih Listem/i);
  assert.doesNotMatch(html, /seo-data-table/i);
});

test("permanent comparison route reuses the interactive comparison screen", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(
      "http://localhost/karsilastir/istanbul-teknik-universitesi-vs-orta-dogu-teknik-universitesi",
      { headers: { accept: "text/html" } },
    ),
    env,
    ctx,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /compare-page/i);
  assert.match(html, /İstanbul Teknik Üniversitesi/i);
  assert.match(html, /Orta Doğu Teknik Üniversitesi/i);
  assert.match(html, /Tercih Listem/i);
  assert.doesNotMatch(html, /comparison-static-table/i);
});


test("three-university comparison route is canonical and renderable", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request(
      "http://localhost/karsilastir/istanbul-teknik-universitesi-vs-orta-dogu-teknik-universitesi-vs-bogazici-universitesi",
      { headers: { accept: "text/html" } },
    ),
    env,
    ctx,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /İstanbul Teknik Üniversitesi/i);
  assert.match(html, /Orta Doğu Teknik Üniversitesi/i);
  assert.match(html, /Boğaziçi Üniversitesi/i);
});
