import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const token = request.cookies.get("adminAccessToken")?.value;

  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return unauthorizedResponse();
    }

    return null;
  } catch {
    return unauthorizedResponse();
  }
}
