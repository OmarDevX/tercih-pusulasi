import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "../../components/json-ld";
import ProgramSearch from "../../program-search";
import {
  getProgramTuplesForUniversity,
  getProgramsForUniversity,
  getResearchForUniversity,
  RESEARCH_META,
  getUniversityBySlug,
  programPath,
  UNIVERSITY_NAMES,
  universityPath,
} from "../../catalog";
import { absoluteUrl } from "../../site";

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };
const formatNumber = (value: number | null) =>
  value === null ? "—" : new Intl.NumberFormat("tr-TR").format(value);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const university = getUniversityBySlug(slug);
  if (!university) return {};
  const programs = getProgramsForUniversity(university);
  const first = programs[0];
  const title = `${university} Bölümleri, 2025 Sıralamaları ve 2026 Kontenjanları`;
  const description = `${university} için ${programs.length} programı; 2025 başarı sıralamaları, 2024 karşılaştırması, 2026 kontenjanları, URAP ${first?.urap ? `#${first.urap}` : "verisi"}, THE ve QS göstergeleriyle inceleyin.`;
  return {
    title,
    description,
    alternates: { canonical: universityPath(university) },
    openGraph: { title, description, url: universityPath(university), type: "article" },
  };
}

export default async function UniversityPage({ params }: PageProps) {
  const { slug } = await params;
  const university = getUniversityBySlug(slug);
  if (!university) notFound();

  const programs = getProgramsForUniversity(university);
  const first = programs[0];
  if (!first) notFound();
  const research = getResearchForUniversity(university);
  const canonical = universityPath(university);

  const researchSummary = research
    ? ` OpenAlex araştırma verisi: ${formatNumber(research.worksCount)} akademik çıktı, H-indeksi ${formatNumber(research.hIndex)}.`
    : "";

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollegeOrUniversity",
            name: university,
            address: { "@type": "PostalAddress", addressLocality: first.city, addressCountry: "TR" },
            url: absoluteUrl(canonical),
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${university} programları`,
            numberOfItems: programs.length,
            itemListElement: programs.slice(0, 100).map((program, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: program.programName,
              url: absoluteUrl(programPath(program)),
            })),
          },
        ]}
      />
      <ProgramSearch
        initialPrograms={getProgramTuplesForUniversity(university)}
        initialUniversities={UNIVERSITY_NAMES}
        initialSelection={{ kind: "university", university }}
        hideActivePageLink
        hero={{
          eyebrow: `${first.city} · ${first.universityType} · ${programs.length} program`,
          title: "Üniversite profili:",
          highlight: university,
          description: `Önce üniversitenin akademik profilini, sıralamalarını ve araştırma göstergelerini incele; ardından tüm bölümleri 2025–2024 başarı sıralamaları ve 2024–2026 kontenjanlarıyla karşılaştır.${researchSummary}`,
        }}
        universityProfile={{
          name: university,
          city: first.city,
          type: first.universityType,
          logo: first.universityLogo,
          programCount: programs.length,
          rankings: {
            urap: first.urap,
            the: first.the,
            qs: first.qs,
          },
          researchUpdatedAt: RESEARCH_META.generatedAt,
          research,
        }}
      />
    </>
  );
}
