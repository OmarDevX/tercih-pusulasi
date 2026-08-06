import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "../components/json-ld";
import SeoHeader from "../components/seo-header";
import { subjectPath } from "../catalog";
import { SUBJECT_GROUPS } from "../data";
import { absoluteUrl } from "../site";

export const metadata: Metadata = {
  title: "Tüm Üniversite Bölümleri ve 2025 Sıralamaları",
  description: `${SUBJECT_GROUPS.length} bölümün 2025 başarı sıralamalarına, 2026 kontenjanlarına ve üniversite seçeneklerine ulaşın.`,
  alternates: { canonical: "/bolumler" },
};

export default function SubjectsDirectoryPage() {
  const sorted = [...SUBJECT_GROUPS].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return (
    <main className="seo-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Türkiye üniversite bölümleri",
        numberOfItems: sorted.length,
        itemListElement: sorted.map((group, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: group.name,
          url: absoluteUrl(subjectPath(group)),
        })),
      }} />
      <SeoHeader eyebrow={`${sorted.length} bölüm başlığı`} title="Tüm üniversite bölümleri" description="A'dan Z'ye bölüm sayfaları: 2025 son yerleşen sıralamaları, 2026 kontenjanları ve program seçenekleri." />
      <div className="seo-content shell">
        <nav className="directory-letter-nav" aria-label="Harfler">
          {[...new Set(sorted.map((group) => group.name[0].toLocaleUpperCase("tr-TR")))].map((letter) => <a href={`#harf-${letter}`} key={letter}>{letter}</a>)}
        </nav>
        {[...new Set(sorted.map((group) => group.name[0].toLocaleUpperCase("tr-TR")))].map((letter) => (
          <section className="directory-section" id={`harf-${letter}`} key={letter}>
            <h2>{letter}</h2>
            <div className="directory-page-grid">
              {sorted.filter((group) => group.name[0].toLocaleUpperCase("tr-TR") === letter).map((group) => (
                <Link href={subjectPath(group)} key={group.name}>
                  <strong>{group.name}</strong><span>{group.scoreTypes.join(" / ")} · Sıralamalar ve kontenjanlar →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
