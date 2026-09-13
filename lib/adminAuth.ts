import { NextRequest, NextResponse } from "next/server";

// Placeholder admin-route guard for API handlers for Mohammed.
//
// This only checks that the adminAccessToken cookie is present, matching the
// page-level check middleware.ts already does — it does not verify the token
// against Supabase. That verification is a separate piece of work (a real
// session check, typed unauthorized/authorized result, unit tests). Swap the
// body of this function for that check; every route below calls it the same
// way, so nothing else needs to change when it lands.
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("adminAccessToken")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
