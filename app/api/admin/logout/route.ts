import { NextResponse } from "next/server";
import { ANALYTICS_COOKIE } from "../../../lib/analytics/auth";
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ANALYTICS_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
