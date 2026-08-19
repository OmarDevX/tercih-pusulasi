export const SITE_NAME = "Tercih Pusulası";
export const DATA_UPDATED_AT = "2026-08-19";
export const PRODUCTION_SITE_URL = "https://tercih-pusulasi.vercel.app";

const normalizeConfiguredUrl = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const getSiteUrl = () =>
  normalizeConfiguredUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeConfiguredUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  PRODUCTION_SITE_URL;

export const absoluteUrl = (path = "/") =>
  new URL(path, `${getSiteUrl()}/`).toString();
