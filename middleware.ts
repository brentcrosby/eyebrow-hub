import { NextRequest, NextResponse } from "next/server";

const CHANGE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Browsers send an Origin header with every change request. If it isn't this
// site, another website is trying to use the admin's cookie (CSRF).
function isSameSite(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  return !!origin && !!host && URL.canParse(origin) && new URL(origin).host === host;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin API: block changes from other sites before any route code runs.
  if (pathname.startsWith("/api/admin/")) {
    if (CHANGE_METHODS.includes(request.method) && !isSameSite(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("adminAccessToken")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Stop the browser keeping admin pages, so Back after logout can't show one.
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
