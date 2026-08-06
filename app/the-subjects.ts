export const THE_SUBJECTS = [
  ["engineering", "Mühendislik"],
  ["medicalHealth", "Tıp ve Sağlık"],
  ["computerScience", "Bilgisayar Bilimleri"],
  ["lifeSciences", "Yaşam Bilimleri"],
  ["physicalSciences", "Fiziksel Bilimler"],
  ["businessEconomics", "İşletme ve Ekonomi"],
  ["artsHumanities", "Sanat ve Beşeri Bilimler"],
  ["education", "Eğitim"],
  ["law", "Hukuk"],
  ["psychology", "Psikoloji"],
  ["socialSciences", "Sosyal Bilimler"],
] as const;

export type TheSubjectKey = typeof THE_SUBJECTS[number][0];
export type TheSubjectRankings = Record<TheSubjectKey, string>;
