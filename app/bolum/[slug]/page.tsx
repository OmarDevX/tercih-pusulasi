import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "../../components/json-ld";
import ProgramSearch from "../../program-search";
import {
  getProgramTuplesForSubject,
  getProgramsForSubject,
  getSubjectBySlug,
  programPath,
  subjectPath,
  UNIVERSITY_NAMES,
} from "../../catalog";
import { absoluteUrl } from "../../site";

export const revalidate = 86400;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = getSubjectBySlug(slug);
  if (!group) return {};
  const programs = getProgramsForSubject(group);
  const title = `${group.name} 2026 Taban Sıralamaları ve Kontenjanları`;
  const description = `${group.name} için ${programs.length} programı; 2026 son yerleşen sıralamaları, 2025 karşılaştırması, 2026 kontenjanları, URAP, THE ve QS verileriyle inceleyin.`;
  return {
    title,
    description,
    alternates: { canonical: subjectPath(group) },
    openGraph: { title, description, url: subjectPath(group), type: "article" },
  };
}

export default async function SubjectPage({ params }: PageProps) {
  const { slug } = await params;
  const group = getSubjectBySlug(slug);
  if (!group) notFound();

  const programs = getProgramsForSubject(group);
  const canonical = subjectPath(group);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Ana sayfa", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Bölümler", item: absoluteUrl("/bolumler") },
              { "@type": "ListItem", position: 3, name: group.name, item: absoluteUrl(canonical) },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${group.name} üniversite programları`,
            numberOfItems: programs.length,
            itemListElement: programs.slice(0, 100).map((program, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `${program.university} ${program.programName}`,
              url: absoluteUrl(programPath(program)),
            })),
          },
        ]}
      />
      <ProgramSearch
        initialPrograms={getProgramTuplesForSubject(group)}
        initialUniversities={UNIVERSITY_NAMES}
        initialSelection={{ kind: "subject", group }}
        hideActivePageLink
        hero={{
          eyebrow: `${group.scoreTypes.join(" / ")} · ${programs.length} program · Kalıcı bölüm rehberi`,
          title: "Bölüm rehberi:",
          highlight: group.name,
          description:
            "Orijinal arama sayfasındaki tüm filtreler, ayrıntılı program kartları, kontenjan eğilimi, URAP, THE, QS ve tercih listesi burada aynen kullanılabilir.",
        }}
      />
    </>
  );
}
