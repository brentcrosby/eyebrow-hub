import { NextRequest } from "next/server";

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  const cookieToken = request.cookies.get("admin_token")?.value;

  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

export function isAuthenticated(request: NextRequest): boolean {
  const token = getAuthToken(request);
  return Boolean(token);
}