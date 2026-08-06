import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CompareClient from "../compare-client";
import JsonLd from "../../components/json-ld";
import { getUniversityBySlug, UNIVERSITY_NAMES } from "../../catalog";
import { getComparePayload } from "../../compare-data";
import { slugify } from "../../slug";
import { absoluteUrl } from "../../site";

export const revalidate = 86400;

type PageProps = { params: Promise<{ comparison: string }> };

const parseComparison = (value: string) => {
  const parts = value.split("-vs-");
  if (parts.length < 2 || parts.length > 3) return null;
  const universities = parts.map((part) => getUniversityBySlug(part));
  if (universities.some((university) => !university)) return null;
  const resolved = universities as string[];
  return new Set(resolved).size === resolved.length ? resolved : null;
};

const pathFor = (universities: string[]) =>
  `/karsilastir/${universities.map(slugify).join("-vs-")}`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { comparison } = await params;
  const universities = parseComparison(comparison);
  if (!universities) return {};
  const title = universities.length === 2
    ? `${universities[0]} mi ${universities[1]} mi? Üniversite Karşılaştırması`
    : `${universities.join(", ")} Üniversite Karşılaştırması`;
  const description = `${universities.join(", ")} kurumlarını URAP, THE, QS, THE 2026 alan sıralamaları, yayın, atıf, H-indeksi ve akademik ivmeyle yan yana inceleyin.`;
  const canonical = pathFor(universities);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article" },
  };
}

export default async function StaticComparisonPage({ params }: PageProps) {
  const { comparison } = await params;
  const names = parseComparison(comparison);
  if (!names) notFound();
  const canonical = pathFor(names);
  if (`/karsilastir/${comparison}` !== canonical) redirect(canonical);
  const payload = await getComparePayload(names);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Ana sayfa", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Üniversite karşılaştır", item: absoluteUrl("/karsilastir") },
            { "@type": "ListItem", position: 3, name: names.join(" – "), item: absoluteUrl(canonical) },
          ],
        }}
      />
      <CompareClient
        initialUniversities={UNIVERSITY_NAMES}
        initialResults={payload.universities}
        initialSelections={names}
        initialResearchMeta={{
          updatedAt: payload.researchDataUpdatedAt,
          ...payload.researchCoverage,
        }}
      />
    </>
  );
}
