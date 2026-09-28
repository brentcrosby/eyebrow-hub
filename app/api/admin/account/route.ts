import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createSupabaseClient } from "@/lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 400, not 401: a 401 would make the admin UI treat it as an expired session.
function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

// GET: the signed-in admin's email.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  return NextResponse.json({ email: auth.user.email });
}

// PATCH: change the email ({ email }) or the password ({ currentPassword, newPassword }).
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const body = await request.json().catch(() => null);
  let changes: { email: string } | { password: string };

  if (typeof body?.email === "string") {
    const email = body.email.trim();
    if (!EMAIL_PATTERN.test(email)) {
      return badRequest("Please enter a valid email address.");
    }
    changes = { email };
  } else if (typeof body?.newPassword === "string") {
    if (body.newPassword.length < 8) {
      return badRequest("New password must be at least 8 characters.");
    }

    // Re-check the current password before allowing a change.
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: auth.user.email ?? "",
      password: String(body.currentPassword ?? ""),
    });
    if (error) {
      return badRequest("Current password is incorrect.");
    }
    changes = { password: body.newPassword };
  } else {
    return badRequest("Nothing to update.");
  }

  // The server has no stored Supabase session, so the update is sent with the
  // admin's own access token straight to Supabase's user endpoint.
  const token = request.cookies.get("adminAccessToken")?.value;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      method: "PUT",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(changes),
    }
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return badRequest(data?.msg ?? "Could not update the account.");
  }

  // Supabase may hold an email change until the new address is confirmed.
  const message = data?.new_email
    ? "Check your new email inbox to confirm the change."
    : "Account updated.";

  return NextResponse.json({ message, email: data?.email });
}
