import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase";

export type AdminAuthResult =
  | { authenticated: true; user: User }
  | { authenticated: false; response: NextResponse };

function extractAccessToken(request: NextRequest): string | AdminAuthResult {
  const token = request.cookies.get("adminAccessToken")?.value;

  if (!token || token.split(".").length !== 3) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return token;
}

async function verifySession(token: string): Promise<AdminAuthResult> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { authenticated: true, user: data.user };
}

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
