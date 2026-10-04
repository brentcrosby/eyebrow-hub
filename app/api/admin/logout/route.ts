import { NextRequest, NextResponse } from "next/server";

// Ends the admin session at Supabase, then removes the session cookie.
// The cookie is removed even if Supabase can't be reached, so logout always works.
export async function POST(request: NextRequest) {
  const token = request.cookies.get("adminAccessToken")?.value;

  if (token) {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`,
      {
        method: "POST",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${token}`,
        },
      }
    ).catch(() => null);
  }

  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.delete("adminAccessToken");
  return response;
}
