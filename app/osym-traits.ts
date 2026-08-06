import traitsJson from "./osym-2026-program-traits.json";
import type { Program } from "./data";
import { normalizeUniversityName } from "./university-utils";

export const OSYM_GUIDE_SOURCE_URL = traitsJson.sourceUrl;
export const OSYM_GUIDE_SOURCE_DATE = traitsJson.sourceDate;
export const OSYM_GUIDE_SOURCE_NAME = traitsJson.source;

const programTraits = traitsJson.programs as Record<
  string,
  { a?: string[]; t?: 1 }
>;
const yokakUniversities = new Set(
  traitsJson.yokakUniversities.map(normalizeUniversityName),
);

const accreditationNames: Record<string, string> = {
  ASIIN: "Accreditation Agency for Study Programs in Engineering, Informatics, Natural Sciences and Mathematics",
  ABET: "Accreditation Board for Engineering and Technology",
  ACEN: "Accreditation Commission for Education in Nursing",
  ACPHA: "Accreditation Commission for Programs in Hospitality Administration",
  AQAS: "Agency for Quality Assurance",
  AACSB: "Association to Advance Collegiate Schools of Business",
  AABI: "Aviation Accreditation Board International",
  DEPAD: "Diş Hekimliği Eğitimi Programları Akreditasyon Derneği",
  ECZAKDER: "Eczacılık Eğitimi Programlarını Değerlendirme ve Akreditasyon Derneği",
  ETMK: "Endüstriyel Tasarımcılar Meslek Kuruluşu Derneği",
  EAEVE: "European Association of Establishments for Veterinary Education",
  FEDEK: "Fen, Edebiyat, Fen-Edebiyat, Dil ve Tarih-Coğrafya Fakülteleri Akreditasyon Derneği",
  FIBAA: "Foundation for International Business Administration Accreditation",
  HEPDAK: "Hemşirelik Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  IACBE: "International Accreditation Council for Business Education",
  "İAA": "İlahiyat Akreditasyon Ajansı",
  "İLAD": "İletişim Araştırmaları Derneği (İletişim Eğitimi Değerlendirme Akreditasyon Kurulu)",
  "MİAK": "Mimarlık Eğitimi Akreditasyon Derneği",
  "MÜDEK": "Mühendislik Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  EPDAD: "Öğretmenlik Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  PEMDER: "Peyzaj Mimarlığı Eğitim ve Bilim Derneği",
  SABAK: "Sağlık Bilimleri Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  STAR: "Sosyal Beşeri ve Temel Bilimler Akreditasyon ve Rating Derneği",
  SPORAK: "Spor Bilimleri Derneği (Spor Bilimleri Eğitim Programları Değerlendirme ve Akreditasyon Kurulu)",
  TAPLAK: "Tasarım ve Planlama Akreditasyon Derneği",
  AHPGS: "The Accreditation Agency in Health and Social Sciences",
  ACQUIN: "The Accreditation, Certification, and Quality Assurance Institute",
  TEPDAD: "Tıp Eğitimi Programlarını Değerlendirme ve Akreditasyon Derneği",
  TUADER: "Turizm Akademisyenleri Derneği (Turizm Eğitimi Değerlendirme ve Akreditasyon Kurulu)",
  TPD: "Türk Psikologlar Derneği",
  VEDEK: "Veteriner Hekimliği Eğitim Kurumları ve Programları Değerlendirme ve Akreditasyon Derneği",
  "ZİDEK": "Ziraat Fakülteleri Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  MEDEK: "Mesleki Eğitim Değerlendirme ve Akreditasyon Derneği",
  TURKPDR: "Türk Psikolojik Danışma ve Rehberlik Derneği (Türk PDR-Der)",
  EPDAK: "Ebelik Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
  "FTR-AD": "Fizyoterapi ve Rehabilitasyon Eğitim Programları Değerlendirme ve Akreditasyon Derneği",
};

export type ProgramAccreditation = {
  code: string;
  name: string;
};

export type OsymProgramTraits = {
  accreditations: ProgramAccreditation[];
  tyc: boolean;
  yokak: boolean;
  tags: string[];
  sourceDate: string;
};

const addUnique = (values: string[], value: string | null | undefined) => {
  if (value && !values.includes(value)) values.push(value);
};

const programTags = (program: Program) => {
  const tags: string[] = [];
  const name = program.programName.toLocaleLowerCase("tr-TR");

  addUnique(tags, program.level);
  addUnique(tags, program.scoreType && program.scoreType !== "—" ? `${program.scoreType} puan türü` : null);
  addUnique(tags, program.language && program.language !== "Türkçe" ? program.language : null);
  addUnique(tags, program.scholarship && program.scholarship !== "Ücretsiz" ? program.scholarship : null);
  addUnique(tags, program.mtok ? "M.T.O.K." : null);
  addUnique(tags, program.location !== "Türkiye" ? program.location : null);
  addUnique(tags, name.includes("açıköğretim") ? "Açıköğretim" : null);
  addUnique(tags, name.includes("uzaktan öğretim") ? "Uzaktan öğretim" : null);
  addUnique(tags, name.includes("ikinci öğretim") ? "İkinci öğretim" : null);
  addUnique(tags, name.includes("uolp") ? "UOLP" : null);
  addUnique(tags, name.includes("suny") ? "SUNY ortak programı" : null);
  addUnique(tags, name.includes("çift diploma") ? "Çift diploma" : null);
  addUnique(tags, name.includes("kktc uyruklu") ? "KKTC uyruklu kontenjanı" : null);
  addUnique(tags, name.includes("yurt dışı") || name.includes("yurtdışı") ? "Yurt dışı programı" : null);

  return tags;
};

export const getOsymProgramTraits = (program: Program): OsymProgramTraits => {
  const raw = programTraits[program.id];
  return {
    accreditations: (raw?.a ?? []).map((code) => ({
      code,
      name: accreditationNames[code] ?? code,
    })),
    tyc: raw?.t === 1,
    yokak: yokakUniversities.has(normalizeUniversityName(program.university)),
    tags: programTags(program),
    sourceDate: OSYM_GUIDE_SOURCE_DATE,
  };
};
