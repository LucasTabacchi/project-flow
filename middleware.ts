import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSafeRedirectTarget } from "@/lib/auth/navigation";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "projectflow_session";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

  if (pathname !== "/" && pathname !== "/login" && pathname !== "/register") {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = getSafeRedirectTarget(searchParams.get("redirectTo"));
  destination.search = "";

  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
