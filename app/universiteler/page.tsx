import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "../components/json-ld";
import SeoHeader from "../components/seo-header";
import { UNIVERSITY_NAMES, universityPath } from "../catalog";
import { absoluteUrl } from "../site";

export const metadata: Metadata = {
  title: "Türkiye Üniversiteleri: Bölümler, Sıralamalar ve Kontenjanlar",
  description: `${UNIVERSITY_NAMES.length} üniversitenin programlarını, 2026 başarı sıralamalarını, 2026 kontenjanlarını ve akademik göstergelerini inceleyin.`,
  alternates: { canonical: "/universiteler" },
};

export default function UniversitiesDirectoryPage() {
  const sorted = [...UNIVERSITY_NAMES].sort((a, b) => a.localeCompare(b, "tr"));
  const letters = [...new Set(sorted.map((name) => name[0].toLocaleUpperCase("tr-TR")))];
  return (
    <main className="seo-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Türkiye üniversiteleri",
        numberOfItems: sorted.length,
        itemListElement: sorted.map((name, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name,
          url: absoluteUrl(universityPath(name)),
        })),
      }} />
      <SeoHeader eyebrow={`${sorted.length} üniversite`} title="Tüm üniversiteler" description="Üniversite profilleri, program listeleri, 2026 sıralamaları, 2026 kontenjanları, URAP, THE ve QS göstergeleri." />
      <div className="seo-content shell">
        <nav className="directory-letter-nav" aria-label="Harfler">{letters.map((letter) => <a href={`#harf-${letter}`} key={letter}>{letter}</a>)}</nav>
        {letters.map((letter) => (
          <section className="directory-section" id={`harf-${letter}`} key={letter}>
            <h2>{letter}</h2>
            <div className="directory-page-grid">
              {sorted.filter((name) => name[0].toLocaleUpperCase("tr-TR") === letter).map((name) => (
                <Link href={universityPath(name)} key={name}><strong>{name}</strong><span>Bölümler ve akademik göstergeler →</span></Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
