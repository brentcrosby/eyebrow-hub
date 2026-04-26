import { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session_token";

export function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN || "stub-session";
}

export function isAdminAuthenticated(request: NextRequest) {
  const expectedToken = getAdminSessionToken();
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = request.headers.get("x-admin-session-token")?.trim();
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  return [bearerToken, headerToken, cookieToken].some(
    (token) => token === expectedToken
  );
}
