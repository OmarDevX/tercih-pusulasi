import type { MetadataRoute } from "next";
import {
  ALL_PROGRAMS,
  programPath,
  subjectPath,
  UNIVERSITY_NAMES,
  universityPath,
} from "./catalog";
import { SUBJECT_GROUPS } from "./data";
import { getSiteUrl } from "./site";
import { slugify } from "./slug";

export const revalidate = 86400;

const lastModified = new Date("2026-08-01T00:00:00+03:00");
const popularComparisons: [string, string][] = [
  ["İstanbul Teknik Üniversitesi", "Orta Doğu Teknik Üniversitesi"],
  ["Boğaziçi Üniversitesi", "Orta Doğu Teknik Üniversitesi"],
  ["Atatürk Üniversitesi", "Fırat Üniversitesi"],
  ["İnönü Üniversitesi", "Sivas Cumhuriyet Üniversitesi"],
  ["Karadeniz Teknik Üniversitesi", "Erciyes Üniversitesi"],
].filter(([left, right]) => UNIVERSITY_NAMES.includes(left) && UNIVERSITY_NAMES.includes(right)) as [string, string][];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const url = (path: string) => new URL(path, `${siteUrl}/`).toString();
  const staticPages: MetadataRoute.Sitemap = [
    ["/", 1, "daily"],
    ["/bolumler", 0.9, "weekly"],
    ["/universiteler", 0.9, "weekly"],
    ["/veri-kaynaklari", 0.7, "monthly"],
    ["/metodoloji", 0.7, "monthly"],
    ["/hakkimizda", 0.5, "yearly"],
    ["/gizlilik", 0.3, "yearly"],
    ["/iletisim", 0.3, "yearly"],
  ].map(([path, priority, changeFrequency]) => ({
    url: url(path as string),
    lastModified,
    changeFrequency: changeFrequency as "daily" | "weekly" | "monthly" | "yearly",
    priority: priority as number,
  }));

  return [
    ...staticPages,
    ...SUBJECT_GROUPS.map((group) => ({
      url: url(subjectPath(group)), lastModified, changeFrequency: "monthly" as const, priority: 0.8,
    })),
    ...UNIVERSITY_NAMES.map((university) => ({
      url: url(universityPath(university)), lastModified, changeFrequency: "monthly" as const, priority: 0.8,
    })),
    ...popularComparisons.map(([left, right]) => ({
      url: url(`/karsilastir/${slugify(left)}-vs-${slugify(right)}`), lastModified,
      changeFrequency: "monthly" as const, priority: 0.65,
    })),
    ...ALL_PROGRAMS.map((program) => ({
      url: url(programPath(program)), lastModified, changeFrequency: "yearly" as const, priority: 0.55,
    })),
  ];
}
