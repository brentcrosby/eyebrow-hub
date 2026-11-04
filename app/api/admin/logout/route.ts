import { NextRequest, NextResponse } from "next/server";

// Ends the admin session at Supabase, then removes the session cookie.
// The cookie is removed even if Supabase can't be reached, so logout always works.
// Gives up on Supabase after 5 seconds so logout never hangs.
export async function POST(request: NextRequest) {
  const token = request.cookies.get("adminAccessToken")?.value;

  const serverSessionEnded = token
    ? await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      )
        .then((res) => res.ok)
        .catch(() => false)
    : true;

  // Say honestly whether the server session ended, not just the cookie.
  const response = NextResponse.json({
    message: serverSessionEnded
      ? "Logged out"
      : "Logged out on this device. The server session will expire on its own.",
  });
  response.cookies.delete("adminAccessToken");
  return response;
}
