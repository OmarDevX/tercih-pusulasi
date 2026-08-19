import { NextResponse } from "next/server";
import { ANALYTICS_COOKIE, analyticsSessionValue, isValidAdminToken } from "../../../lib/analytics/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (!isValidAdminToken(token)) return NextResponse.redirect(new URL("/admin?error=1", request.url), 303);
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ANALYTICS_COOKIE, analyticsSessionValue(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}
