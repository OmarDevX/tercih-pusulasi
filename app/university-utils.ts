export const cleanUniversityName = (name: string) =>
  name.replace(/\s+\([^)]*\)\s*$/, "").trim();

export const titleCase = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s/(-])([a-zçğıöşü])/gu, (_, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("tr-TR")}`,
    );

export const displayUniversityName = (name: string) =>
  titleCase(cleanUniversityName(name));

export const normalizeUniversityName = (name: string) =>
  cleanUniversityName(name)
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-zçğıöşü0-9]+/gu, " ")
    .trim();
