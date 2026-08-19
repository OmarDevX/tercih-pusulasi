import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import JsonLd from "../../components/json-ld";
import ProgramSearch from "../../program-search";
import {
  getProgramById,
  getProgramTuplesForSubject,
  getSubjectBySlug,
  programPath,
  subjectPath,
  UNIVERSITY_NAMES,
  universityPath,
} from "../../catalog";
import { slugify } from "../../slug";
import { absoluteUrl } from "../../site";

export const revalidate = 86400;

type PageProps = { params: Promise<{ program: string }> };
const formatNumber = (value: number | null) =>
  value === null ? "—" : new Intl.NumberFormat("tr-TR").format(value);
const programIdFromParam = (value: string) => value.match(/^\d+/)?.[0] ?? "";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { program: param } = await params;
  const program = getProgramById(programIdFromParam(param));
  if (!program) return {};
  const title = `${program.university} ${program.programName}: 2026 Sıralaması`;
  const description = `${program.programName} için güncel 2026 YÖK Atlas başarı sırası, 2025 sırası ${formatNumber(program.rank2025)} ve 2026 kontenjanı ${formatNumber(program.quota2026)}. ${program.university}, ${program.city}.`;
  return {
    title,
    description,
    alternates: { canonical: programPath(program) },
    openGraph: { title, description, url: programPath(program), type: "article" },
  };
}

export default async function ProgramPage({ params }: PageProps) {
  const { program: param } = await params;
  const program = getProgramById(programIdFromParam(param));
  if (!program) notFound();

  const canonical = programPath(program);
  if (`/program/${param}` !== canonical && param !== program.id) redirect(canonical);

  const group = getSubjectBySlug(slugify(program.subject));
  if (!group) notFound();

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            name: program.programName,
            description: `${program.university} bünyesindeki ${program.programName} programı için YKS sıralama ve kontenjan bilgileri.`,
            provider: {
              "@type": "CollegeOrUniversity",
              name: program.university,
              url: absoluteUrl(universityPath(program.university)),
            },
            educationalCredentialAwarded: program.level,
            occupationalCategory: program.subject,
            url: absoluteUrl(canonical),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Ana sayfa", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: program.subject, item: absoluteUrl(subjectPath(group)) },
              { "@type": "ListItem", position: 3, name: program.university, item: absoluteUrl(universityPath(program.university)) },
              { "@type": "ListItem", position: 4, name: program.programName, item: absoluteUrl(canonical) },
            ],
          },
        ]}
      />
      <ProgramSearch
        initialPrograms={getProgramTuplesForSubject(group)}
        initialUniversities={UNIVERSITY_NAMES}
        initialSelection={{ kind: "subject", group }}
        focusedProgramId={program.id}
        hero={{
          eyebrow: `${program.scoreType} · ${program.level} · ÖSYM ${program.id}`,
          title: "Program detayı:",
          highlight: program.programName,
          description: `${program.university} · ${program.city}. Açtığın program listenin başında vurgulanır; orijinal karttaki sıralama, URAP, THE, QS, kontenjan eğilimi ve tercih listesi özelliklerinin tamamı kullanılabilir.`,
        }}
      />
    </>
  );
}
