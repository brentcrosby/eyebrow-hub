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

export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const token = extractAccessToken(request);

  if (typeof token !== "string") {
    return token;
  }

  return verifySession(token);
}
