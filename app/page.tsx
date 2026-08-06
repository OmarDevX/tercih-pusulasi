import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "./components/json-ld";
import ProgramSearch from "./program-search";
import {
  getProgramTuplesForSubject,
  subjectPath,
  UNIVERSITY_NAMES,
  universityPath,
} from "./catalog";
import { CATALOG_STATS, SUBJECT_GROUPS } from "./data";
import { absoluteUrl } from "./site";
import { slugify } from "./slug";

export const metadata: Metadata = {
  title: "YKS Tercih Pusulası: 2025 Sıralamaları ve 2026 Kontenjanları",
  description:
    "21.493 üniversite programını 2025 başarı sıralamaları, 2026 kontenjanları, URAP, THE ve QS verileriyle karşılaştırın.",
  alternates: { canonical: "/" },
};

const defaultGroup =
  SUBJECT_GROUPS.find((group) => group.name === "Elektrik-Elektronik Mühendisliği") ??
  SUBJECT_GROUPS[0];

const wantedSubjects = [
  "Elektrik-Elektronik Mühendisliği",
  "Bilgisayar Mühendisliği",
  "Yazılım Mühendisliği",
  "Mekatronik Mühendisliği",
  "Makine Mühendisliği",
  "Endüstri Mühendisliği",
  "İnşaat Mühendisliği",
  "Tıp",
  "Diş Hekimliği",
  "Hemşirelik",
  "Eczacılık",
  "Hukuk",
  "Psikoloji",
  "Mimarlık",
  "Yönetim Bilişim Sistemleri",
  "Fizyoterapi ve Rehabilitasyon",
];

const popularComparisons: [string, string][] = [
  ["İstanbul Teknik Üniversitesi", "Orta Doğu Teknik Üniversitesi"],
  ["Boğaziçi Üniversitesi", "Orta Doğu Teknik Üniversitesi"],
  ["Atatürk Üniversitesi", "Fırat Üniversitesi"],
  ["İnönü Üniversitesi", "Sivas Cumhuriyet Üniversitesi"],
  ["Karadeniz Teknik Üniversitesi", "Erciyes Üniversitesi"],
];

const wantedUniversities = [
  "Orta Doğu Teknik Üniversitesi",
  "İstanbul Teknik Üniversitesi",
  "Boğaziçi Üniversitesi",
  "Hacettepe Üniversitesi",
  "Ankara Üniversitesi",
  "İstanbul Üniversitesi",
  "Gazi Üniversitesi",
  "Ege Üniversitesi",
  "Yıldız Teknik Üniversitesi",
  "Marmara Üniversitesi",
  "Atatürk Üniversitesi",
  "Fırat Üniversitesi",
  "Erciyes Üniversitesi",
  "İnönü Üniversitesi",
  "Sivas Cumhuriyet Üniversitesi",
  "Karadeniz Teknik Üniversitesi",
];

export default function HomePage() {
  const popularSubjects = wantedSubjects
    .map((name) => SUBJECT_GROUPS.find((group) => group.name === name))
    .filter((group): group is (typeof SUBJECT_GROUPS)[number] => Boolean(group));
  const popularUniversities = wantedUniversities.filter((name) =>
    UNIVERSITY_NAMES.includes(name),
  );

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Tercih Pusulası",
            url: absoluteUrl("/"),
            inLanguage: "tr-TR",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Tercih Pusulası",
            url: absoluteUrl("/"),
            logo: absoluteUrl("/favicon.svg"),
          },
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: "Türkiye Üniversite Programları, Başarı Sıralamaları ve Kontenjanları",
            description:
              "2024–2025 son yerleşen başarı sıralamaları, 2024–2026 kontenjanları ve üniversite akademik sıralamaları.",
            url: absoluteUrl("/veri-kaynaklari"),
            inLanguage: "tr-TR",
            temporalCoverage: "2024/2026",
            spatialCoverage: "Türkiye",
            distribution: {
              "@type": "DataDownload",
              encodingFormat: "text/html",
              contentUrl: absoluteUrl("/"),
            },
          },
        ]}
      />

      <ProgramSearch
        initialPrograms={getProgramTuplesForSubject(defaultGroup)}
        initialUniversities={UNIVERSITY_NAMES}
      />

      <section className="seo-discovery" aria-labelledby="seo-discovery-title">
        <div className="shell">
          <div className="seo-section-heading">
            <span>Kalıcı tercih rehberleri</span>
            <h2 id="seo-discovery-title">Bölüm ve üniversite sayfalarını keşfet</h2>
            <p>
              Arama sonuçlarının yanında her bölüm ve üniversite için 2025 sıralaması,
              2026 kontenjanı ve akademik göstergeleri içeren kalıcı sayfalar bulunur.
            </p>
          </div>

          <div className="seo-link-columns">
            <section>
              <h3>Popüler bölümler</h3>
              <div className="seo-link-grid">
                {popularSubjects.map((group) => (
                  <Link href={subjectPath(group)} key={group.name}>
                    <strong>{group.name}</strong>
                    <span>{group.scoreTypes.join(" / ")} · Sıralama ve kontenjan →</span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h3>Öne çıkan üniversiteler</h3>
              <div className="seo-link-grid universities">
                {popularUniversities.map((university) => (
                  <Link href={universityPath(university)} key={university}>
                    <strong>{university}</strong>
                    <span>Bölümler ve akademik göstergeler →</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="popular-comparisons">
            <h3>Popüler üniversite karşılaştırmaları</h3>
            <div className="inline-links">
              {popularComparisons
                .filter(([left, right]) => UNIVERSITY_NAMES.includes(left) && UNIVERSITY_NAMES.includes(right))
                .map(([left, right]) => (
                  <Link href={`/karsilastir/${slugify(left)}-vs-${slugify(right)}`} key={`${left}-${right}`}>
                    {left.replace(" Üniversitesi", "")} vs {right.replace(" Üniversitesi", "")}
                  </Link>
                ))}
            </div>
          </section>

          <div className="directory-actions">
            <Link href="/bolumler">634 bölümün tamamını listele →</Link>
            <Link href="/universiteler">228 üniversitenin tamamını listele →</Link>
          </div>

          <div className="catalog-stat-strip" aria-label="Katalog kapsamı">
            <span><strong>{CATALOG_STATS.subjects.toLocaleString("tr-TR")}</strong> bölüm</span>
            <span><strong>{CATALOG_STATS.universities.toLocaleString("tr-TR")}</strong> üniversite</span>
            <span><strong>{CATALOG_STATS.programs.toLocaleString("tr-TR")}</strong> program</span>
            <Link href="/veri-kaynaklari">Veri kaynakları ve yöntem →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
