import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ANALYTICS_COOKIE = "tp_admin_analytics";

function secret() { return process.env.ADMIN_ANALYTICS_TOKEN || ""; }
function signature() { return secret() ? createHmac("sha256", secret()).update("analytics-admin-v1").digest("hex") : ""; }

export function isValidAdminToken(token: string) {
  const expected = secret();
  if (!expected || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function isAnalyticsAdmin() {
  const value = (await cookies()).get(ANALYTICS_COOKIE)?.value || "";
  const expected = signature();
  return Boolean(expected && value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected)));
}

export function analyticsSessionValue() { return signature(); }
