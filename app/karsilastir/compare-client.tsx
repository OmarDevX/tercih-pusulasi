"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { slugify } from "../slug";
import { DEFAULT_COMPARE_SELECTIONS } from "../routes";
import { PreferenceListButton } from "../components/preference-list";
import { normalizeUniversityName } from "../university-utils";
import { scoreUniversities, type AcademicScore } from "../university-score";
import { THE_SUBJECTS, type TheSubjectRankings } from "../the-subjects";

type YearCount = { year: number; works_count: number; cited_by_count: number };
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

type ScoredUniversity = CompareUniversity & AcademicScore;

type CompareResponse = {
  dataVersion?: string;
  universities?: CompareUniversity[];
  error?: string;
  researchDataUpdatedAt?: string;
  researchCoverage?: { matched: number; total: number };
};

const DEFAULT_SELECTIONS = [...DEFAULT_COMPARE_SELECTIONS, ""];
const universityPagePath = (university: string) => `/universite/${slugify(university)}`;
const comparisonPagePath = (universities: string[]) =>
  `/karsilastir/${universities.map(slugify).join("-vs-")}`;

const resolveUniversitySelections = (values: string[], universities: string[]) => {
  const requested = values.map((value) => value.trim()).filter(Boolean);
  if (requested.length < 2 || requested.length > 3) return null;
  const resolved = requested.map((value) =>
    universities.find(
      (university) => normalizeUniversityName(university) === normalizeUniversityName(value),
    ),
  );
  if (resolved.some((university) => !university)) return null;
  const names = resolved as string[];
  return new Set(names).size === names.length ? names : null;
};

const formatNumber = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("tr-TR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);

const trendLabel = (growth: number | null | undefined) => {
  if (growth === null || growth === undefined) return { label: "Veri yok", tone: "neutral" };
  if (growth >= 10) return { label: "Belirgin yükseliş", tone: "up" };
  if (growth >= 2) return { label: "Yükseliyor", tone: "up" };
  if (growth > -8) return { label: "Dengeli", tone: "neutral" };
  return { label: "Geriliyor", tone: "down" };
};

type CompareClientProps = {
  initialUniversities: string[];
  initialResults: CompareUniversity[];
  initialResearchMeta: { updatedAt: string; matched: number; total: number } | null;
  initialSelections?: string[];
};

export default function CompareClient({
  initialUniversities,
  initialResults,
  initialResearchMeta,
  initialSelections,
}: CompareClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const resolvedInitialSelections = initialSelections?.length
    ? [...initialSelections.slice(0, 3), "", ""].slice(0, 3)
    : DEFAULT_SELECTIONS;
  const [universities, setUniversities] = useState<string[]>(initialUniversities);
  const [selections, setSelections] = useState(resolvedInitialSelections);
  const [results, setResults] = useState<CompareUniversity[]>(initialResults);
  const [loading, setLoading] = useState(initialResults.length === 0);
  const [routeUpdating, setRouteUpdating] = useState(false);
  const [error, setError] = useState("");
  const [researchMeta, setResearchMeta] = useState<{ updatedAt: string; matched: number; total: number } | null>(initialResearchMeta);
  const routeStateKey = [
    initialSelections?.join("|") ?? "",
    initialResults.map((university) => university.name).join("|"),
  ].join("::");

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const nextSelections = initialSelections?.length
      ? [...initialSelections.slice(0, 3), "", ""].slice(0, 3)
      : DEFAULT_SELECTIONS;
    setSelections(nextSelections);
    setUniversities(initialUniversities);
    setResults(initialResults);
    setResearchMeta(initialResearchMeta);
    setLoading(initialResults.length === 0);
    setRouteUpdating(false);
    setError("");
    // The route key represents the committed comparison shown by the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStateKey]);

  const compare = (values: string[]) => {
    const selected = values.map((value) => value.trim()).filter(Boolean);
    if (selected.length < 2) {
      setError("En az iki üniversite seçmelisin.");
      return;
    }
    if (new Set(selected.map(normalizeUniversityName)).size !== selected.length) {
      setError("Aynı üniversiteyi iki kez seçemezsin.");
      return;
    }
    const resolved = resolveUniversitySelections(values, universities);
    if (!resolved) {
      setError("Seçilen üniversitelerden biri katalogda bulunamadı.");
      return;
    }

    setError("");
    setSelections([...resolved, "", ""].slice(0, 3));
    const nextPath = comparisonPagePath(resolved);
    if (pathname === nextPath) {
      setRouteUpdating(false);
      return;
    }
    setRouteUpdating(true);
    router.push(nextPath, { scroll: false });
  };

  useEffect(() => {
    const names = resolveUniversitySelections(selections, universities);
    if (!names) return;
    const nextPath = comparisonPagePath(names);
    if (nextPath === pathname) return;

    const timer = window.setTimeout(() => {
      setRouteUpdating(true);
      router.replace(nextPath, { scroll: false });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [pathname, router, selections, universities]);

  useEffect(() => {
    if (initialUniversities.length > 0 && initialResults.length > 0) return;

    fetch("/api/universities")
      .then((response) => response.json() as Promise<{ universities: string[] }>)
      .then((payload) => setUniversities(payload.universities))
      .catch(() => setUniversities([]));

    const params = new URLSearchParams();
    DEFAULT_SELECTIONS.filter(Boolean).forEach((university) => params.append("university", university));
    fetch(`/api/compare?${params}`)
      .then(async (response) => {
        const payload = await response.json() as CompareResponse;
        if (!response.ok || !payload.universities) throw new Error(payload.error ?? "Karşılaştırma yüklenemedi.");
        setResults(payload.universities);
        if (payload.researchDataUpdatedAt && payload.researchCoverage) {
          setResearchMeta({ updatedAt: payload.researchDataUpdatedAt, ...payload.researchCoverage });
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Karşılaştırma yüklenemedi."))
      .finally(() => setLoading(false));
  }, [initialResults.length, initialUniversities.length]);

  const scored = useMemo(() => scoreUniversities(results), [results]);
  const draftSignature = selections.map((value) => value.trim()).filter(Boolean).join("|");
  const committedSignature = results.map((university) => university.name).join("|");
  const comparisonDirty = draftSignature !== committedSignature;
  const comparisonUpdating = routeUpdating || loading;
  const scorePositions = useMemo(
    () => new Map([...scored].sort((a, b) => b.points - a.points).map((item, index) => [item.name, index + 1])),
    [scored],
  );
  const winner = scored.length
    ? [...scored].sort((a, b) => b.points - a.points)[0]
    : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    compare(selections);
  };

  return (
    <main className="compare-page">
      <section className="compare-hero">
        <div className="hero-grid" aria-hidden="true" />
        <header className="site-header shell">
          <Link className="brand" href="/" aria-label="Tercih Pusulası ana sayfa">
            <span className="brand-pin"><span>⌁</span></span>
            <span>Tercih<br />Pusulası</span>
          </Link>
          <nav aria-label="Ana menü">
            <Link href="/"><span aria-hidden="true">⌕</span> Ara</Link>
            <Link className="directory-nav-link" href="/bolumler"><span aria-hidden="true">☷</span> Bölümler</Link>
            <Link className="directory-nav-link" href="/universiteler"><span aria-hidden="true">◇</span> Üniversiteler</Link>
            <Link className="active" href={pathname}><span aria-hidden="true">⇄</span> Karşılaştır</Link>
            <PreferenceListButton />
          </nav>
        </header>

        <div className="compare-hero-content shell">
          <div>
            <div className="eyebrow"><span /> Akademik karşılaştırma laboratuvarı</div>
            <h1>Üniversiteleri <em>veriyle</em> karşılaştır.</h1>
            <p>İki veya üç üniversite seç; genel ve alan sıralamalarını, araştırma etkisini, yayın ivmesini, kuruluş yılını ve barınma bilgilerini tek tabloda gör.</p>
          </div>
          <div className="compare-live-note">
            <b>GÜNCEL ARAŞTIRMA VERİSİ</b>
            <span>OpenAlex + ROR</span>
            <small>{researchMeta
              ? `${new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(researchMeta.updatedAt))} · ${researchMeta.matched}/${researchMeta.total} üniversite`
              : "Akademik göstergeler yerel yedekle güvence altında."}</small>
          </div>
        </div>
      </section>

      <section className="compare-picker-wrap">
        <form className="compare-picker shell" onSubmit={submit}>
          <datalist id="university-compare-options">
            {universities.map((university) => <option key={university} value={university} />)}
          </datalist>
          <div className="compare-picker-heading">
            <div>
              <span>2–3 üniversite</span>
              <h2>Karşılaştırılacak kurumlar</h2>
            </div>
            <button type="submit" disabled={loading && results.length === 0}>
              {comparisonUpdating ? "Güncelleniyor…" : "Karşılaştır →"}
            </button>
          </div>
          <div className="compare-inputs">
            {selections.map((selection, index) => (
              <label key={index}>
                <span>{index + 1}. üniversite{index === 2 ? " (isteğe bağlı)" : ""}</span>
                <input
                  list="university-compare-options"
                  value={selection}
                  onChange={(event) => {
                    setError("");
                    setSelections((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value));
                  }}
                  placeholder="Üniversite adını yaz"
                  required={index < 2}
                />
              </label>
            ))}
          </div>
          {error && <p className="compare-error" role="alert">{error}</p>}
        </form>
      </section>

      <section
        className={`compare-results shell ${comparisonUpdating ? "is-updating" : ""}`.trim()}
        aria-live="polite"
        aria-busy={comparisonUpdating}
      >
        {(comparisonDirty || comparisonUpdating) && results.length > 0 && (
          <div className={`compare-update-strip ${comparisonUpdating ? "is-loading" : ""}`.trim()} role="status">
            <span className="compare-update-icon" aria-hidden="true">⇄</span>
            <div>
              <strong>{comparisonUpdating ? "Karşılaştırma güncelleniyor" : "Yeni seçimi tamamla"}</strong>
              <small>
                {comparisonUpdating
                  ? "Mevcut sonuçlar görünür kalır; yeni veriler hazır olduğunda yumuşakça değiştirilir."
                  : "Sonuçlar kaybolmaz. Geçerli üniversite adları tamamlandığında adres ve veriler otomatik eşitlenir."}
              </small>
            </div>
            {comparisonUpdating && <span className="compare-update-loader" aria-hidden="true" />}
          </div>
        )}
        {winner ? (
          <div className="compare-results-content" key={committedSignature}>
            <div className="winner-banner">
              <div className="winner-crown" aria-hidden="true">★</div>
              <div>
                <span>Bu karşılaştırmanın akademik kazananı</span>
                <h2><Link href={universityPagePath(winner.name)}>{winner.name}</Link></h2>
                <p>Sıralama, araştırma etkisi ve 2021–2025 yayın ivmesinin birleşik puanı.</p>
              </div>
              <strong>{formatNumber(winner.points, 1)}<small>/100</small></strong>
            </div>

            <div className={`score-grid score-grid-${scored.length}`}>
              {scored.map((university) => (
                <article className={`score-card ${university.name === winner.name ? "winner" : ""}`} key={university.name}>
                  <div className="score-card-top">
                    <div className="compare-uni-mark" aria-hidden="true">
                      {university.logo
                        ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={university.logo} alt="" />
                        )
                        : <span>{university.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>}
                    </div>
                    <span>#{scorePositions.get(university.name)}</span>
                  </div>
                  <h3><Link href={universityPagePath(university.name)}>{university.name}<span aria-hidden="true"> ↗</span></Link></h3>
                  <p>{university.city} · {university.type}</p>
                  <div className="score-ring" style={{ "--score": `${university.points * 3.6}deg` } as CSSProperties}>
                    <strong>{formatNumber(university.points, 1)}</strong><small>puan</small>
                  </div>
                  <div className="score-breakdown">
                    <span>Sıralama <b>{formatNumber(university.rankingPoints, 0)}</b></span>
                    <span>Araştırma <b>{formatNumber(university.researchPoints, 0)}</b></span>
                    <span>İvme <b>{formatNumber(university.trendPoints, 0)}</b></span>
                  </div>
                </article>
              ))}
            </div>

            <ComparisonTable universities={scored} />
            <SubjectStrengths universities={scored} />
            <ResearchTrends universities={scored} />
            <CostComparison universities={scored} />

            <section className="compare-method">
              <div>
                <span>Şeffaf puanlama</span>
                <h2>Puan nasıl hesaplanıyor?</h2>
              </div>
              <div className="method-grid">
                <article><b>55%</b><h3>Sıralamalar</h3><p>URAP %50, THE %25 ve QS %25. “Listelenmedi” düşük taban puanı alır.</p></article>
                <article><b>35%</b><h3>Araştırma etkisi</h3><p>H-indeksi, atıf/yayın, son iki yıl etki ortalaması ve toplam yayın.</p></article>
                <article><b>10%</b><h3>Akademik ivme</h3><p>2021 ile 2025 arasındaki yıllık araştırma çıktısı değişimi.</p></article>
              </div>
              <p className="method-note">Bir sıralamada “Listelenmedi” sonucu 5/100 kabul edilir; eksik kayıt artık ortalamadan çıkarılıp üniversiteye avantaj sağlamaz. THE alan sıralamaları yalnızca kurumun 2026 profilinde yayımlanmışsa gösterilir ve toplam puanı değiştirmez. Araştırma puanı yalnızca seçilen üniversiteler arasında göreli hesaplanır. Yurt fiyatı merkezî ve güncel biçimde doğrulanamadığında toplam puana katılmaz.</p>
              <div className="source-links">
                <a href="https://developers.openalex.org/" target="_blank" rel="noreferrer">OpenAlex araştırma verisi ↗</a>
                <a href="https://ror.org/" target="_blank" rel="noreferrer">ROR kuruluş bilgisi ↗</a>
                <a href="https://newtr.urapcenter.org/" target="_blank" rel="noreferrer">URAP 2025–2026 ↗</a>
                <a href="https://www.timeshighereducation.com/world-university-rankings/by-subject" target="_blank" rel="noreferrer">THE alan sıralamaları 2026 ↗</a>
                <a href="https://www.topuniversities.com/world-university-rankings" target="_blank" rel="noreferrer">QS Dünya 2027 ↗</a>
                <a href="https://kygm.gsb.gov.tr/" target="_blank" rel="noreferrer">GSB/KYGM barınma ↗</a>
              </div>
            </section>
          </div>
        ) : (
          <div className="compare-initial-loading" role="status">
            <span className="loading-ring" aria-hidden="true" />
            <h2>Karşılaştırma hazırlanıyor</h2>
            <p>Üniversite verileri yüklenirken bu alan sabit kalır.</p>
          </div>
        )}
      </section>
    </main>
  );
}

const subjectRankPosition = (value: string) =>
  Number(value.replace(/[=+]/g, "").match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

function ComparisonTable({ universities }: { universities: ScoredUniversity[] }) {
  const subjectRankingRows = THE_SUBJECTS
    .filter(([key]) => universities.some((item) => item.subjectRankings[key] && item.subjectRankings[key] !== "Listelenmedi"))
    .map(([key, label]) => ({
      label: `THE ${label} 2026`,
      value: (item: ScoredUniversity) => item.subjectRankings[key] ?? "Listelenmedi",
    }));

  const rows = [
    { label: "URAP Türkiye", value: (item: ScoredUniversity) => item.rankings.urap ? `#${item.rankings.urap}` : "Listelenmedi" },
    { label: "THE Dünya 2026", value: (item: ScoredUniversity) => item.rankings.the },
    { label: "QS Dünya 2027", value: (item: ScoredUniversity) => item.rankings.qs },
    ...subjectRankingRows,
    { label: "Kuruluş yılı", value: (item: ScoredUniversity) => formatNumber(item.research?.established) },
    { label: "Toplam akademik çıktı", value: (item: ScoredUniversity) => formatNumber(item.research?.worksCount) },
    { label: "Toplam atıf", value: (item: ScoredUniversity) => formatNumber(item.research?.citedByCount) },
    { label: "H-indeksi", value: (item: ScoredUniversity) => formatNumber(item.research?.hIndex) },
    { label: "Atıf / yayın", value: (item: ScoredUniversity) => formatNumber(item.research?.citationsPerWork, 1) },
    { label: "2 yıllık ort. etki", value: (item: ScoredUniversity) => formatNumber(item.research?.meanCitedness2y, 2) },
  ];
  return (
    <section className="compare-section">
      <div className="compare-section-heading"><span>Yan yana görünüm</span><h2>Akademik göstergeler</h2></div>
      <div className="comparison-table-wrap">
        <table className="comparison-table">
          <thead><tr><th>Gösterge</th>{universities.map((item) => <th key={item.name}><Link href={universityPagePath(item.name)}>{item.name}</Link></th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.label}><th>{row.label}</th>{universities.map((item) => <td key={item.name}>{row.value(item)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}


function SubjectStrengths({ universities }: { universities: ScoredUniversity[] }) {
  return (
    <section className="compare-section">
      <div className="compare-section-heading">
        <span>Alan profili</span>
        <h2>Üniversite hangi alanlarda öne çıkıyor?</h2>
        <p>THE 2026 alan sıralamalarındaki en güçlü yayımlanmış sonuçlar.</p>
      </div>
      <div className={`subject-strength-grid subject-strength-grid-${universities.length}`}>
        {universities.map((university) => {
          const strengths = THE_SUBJECTS
            .map(([key, label]) => ({ key, label, rank: university.subjectRankings[key] ?? "Listelenmedi" }))
            .filter((item) => item.rank !== "Listelenmedi")
            .sort((a, b) => subjectRankPosition(a.rank) - subjectRankPosition(b.rank))
            .slice(0, 4);
          return (
            <article key={university.name}>
              <h3><Link href={universityPagePath(university.name)}>{university.name}</Link></h3>
              {strengths.length > 0 ? (
                <ol>
                  {strengths.map((strength) => (
                    <li key={strength.key}><span>{strength.label}</span><b>{strength.rank}</b></li>
                  ))}
                </ol>
              ) : (
                <p>Yayımlanmış THE 2026 alan sıralaması bulunamadı.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ResearchTrends({ universities }: { universities: ScoredUniversity[] }) {
  return (
    <section className="compare-section">
      <div className="compare-section-heading"><span>Son yıllar</span><h2>Araştırma üretimi yükseliyor mu?</h2></div>
      <div className={`trend-grid trend-grid-${universities.length}`}>
        {universities.map((university) => {
          const counts = university.research?.countsByYear ?? [];
          const max = Math.max(...counts.map((item) => item.works_count), 1);
          const trend = trendLabel(university.research?.outputGrowth);
          return (
            <article key={university.name}>
              <div className="trend-card-title"><div><h3><Link href={universityPagePath(university.name)}>{university.name}</Link></h3><span className={`trend-pill ${trend.tone}`}>{trend.label}</span></div><strong>{university.research?.outputGrowth === null || university.research?.outputGrowth === undefined ? "—" : `${university.research.outputGrowth >= 0 ? "+" : ""}${formatNumber(university.research.outputGrowth, 1)}%`}</strong></div>
              <div className="trend-bars">{counts.map((item) => <div key={item.year}><span><i style={{ height: `${Math.max(8, item.works_count / max * 100)}%` }} /></span><b>{item.year}</b><small>{formatNumber(item.works_count)}</small></div>)}</div>
              <p>2021–2025 yıllık OpenAlex araştırma çıktısı. 2026 tamamlanmadığı için ivme hesabına alınmaz.</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CostComparison({ universities }: { universities: ScoredUniversity[] }) {
  return (
    <section className="compare-section">
      <div className="compare-section-heading"><span>Barınma ve ücret</span><h2>Maliyet tarafında ne biliniyor?</h2><p>Doğrulanmayan rakamları tahmin olarak göstermiyoruz.</p></div>
      <div className={`cost-grid cost-grid-${universities.length}`}>
        {universities.map((university) => (
          <article key={university.name}>
            <span className="cost-type">{university.type}</span>
            <h3><Link href={universityPagePath(university.name)}>{university.name}</Link></h3>
            <dl>
              <div><dt>Öğrenim ücreti modeli</dt><dd>{university.cost.tuitionModel}</dd></div>
              <div><dt>Barınma seçenekleri</dt><dd>{university.cost.housing}</dd></div>
              <div><dt>Doğrulanmış güncel yurt fiyatı</dt><dd className="unverified">Merkezî veri yok</dd></div>
            </dl>
            <p>{university.cost.note}</p>
            <div className="cost-links">
              {university.research?.officialWebsite && <a href={university.research.officialWebsite} target="_blank" rel="noreferrer">Üniversitenin resmî sitesi ↗</a>}
              <a href={university.cost.officialHousingUrl} target="_blank" rel="noreferrer">GSB/KYK ücret işlemleri ↗</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
