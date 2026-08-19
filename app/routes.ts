import { slugify } from "./slug";

export const DEFAULT_COMPARE_SELECTIONS = [
  "İstanbul Teknik Üniversitesi",
  "Orta Doğu Teknik Üniversitesi",
] as const;

export const DEFAULT_COMPARE_PATH = `/karsilastir/${DEFAULT_COMPARE_SELECTIONS
  .map(slugify)
  .join("-vs-")}`;
