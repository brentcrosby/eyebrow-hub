import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { isApprovedAdmin } from "@/lib/adminAuth";
import { checkBookingLimit } from "@/lib/bookingRateLimit";

type LoginBody = {
  email?: string;
  password?: string;
};

// Every attempt counts (even malformed ones), so password guessing is slowed down.
// Only a hash of the caller's IP is stored, never the IP or the credentials.
async function loginLimitResponse(request: NextRequest) {
  try {
    const retryAfter = await checkBookingLimit("login", request.headers);
    if (retryAfter === null) return null;
    return NextResponse.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  } catch {
    return NextResponse.json(
      { message: "Login is temporarily unavailable." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const limited = await loginLimitResponse(request);
  if (limited) return limited;

  try {
    const body: LoginBody = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Only approved admins get a session. The message doesn't reveal who is approved.
    if (!isApprovedAdmin(data.user.id)) {
      return NextResponse.json(
        { message: "This account does not have admin access." },
        { status: 403 }
      );
    }

    // The token goes only into an HttpOnly cookie, so browser scripts can't read it.
    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set("adminAccessToken", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in,
    });
    return response;
  } catch {
    return NextResponse.json(
      { message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
