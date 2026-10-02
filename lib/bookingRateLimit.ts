import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export type BookingOperation = "create" | "lookup" | "cancel";

export const BOOKING_LIMITS: Record<BookingOperation, number> = {
  create: 5,
  lookup: 30,
  cancel: 10,
};
export const BOOKING_WINDOW_MS = 15 * 60_000;

type Count = { request_count: number; expires_at: Date };
export type Counter = (
  operation: BookingOperation,
  callerKey: string,
  now: Date,
  windowMs: number
) => Promise<Count>;

// A single PostgreSQL upsert serializes competing increments for this key, even
// when requests run on different Vercel functions or application instances.
export const postgresCounter: Counter = async (
  operation,
  callerKey,
  now,
  windowMs
) => {
  const expiresAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<Count[]>`
    INSERT INTO "booking_request_limits" ("operation", "caller_key", "request_count", "expires_at")
    VALUES (${operation}, ${callerKey}, 1, ${expiresAt})
    ON CONFLICT ("operation", "caller_key") DO UPDATE SET
      "request_count" = CASE
        WHEN "booking_request_limits"."expires_at" <= ${now} THEN 1
        ELSE "booking_request_limits"."request_count" + 1
      END,
      "expires_at" = CASE
        WHEN "booking_request_limits"."expires_at" <= ${now} THEN ${expiresAt}
        ELSE "booking_request_limits"."expires_at"
      END
    RETURNING "request_count", "expires_at"
  `;
  if (!rows[0]) throw new Error("Rate-limit counter returned no row");
  return rows[0];
};

export function trustedCallerIp(
  headers: Headers,
  env: NodeJS.ProcessEnv
): string | null {
  // Vercel controls this header at its ingress. Elsewhere the operator MUST
  // configure a header stripped and set by their own trusted proxy.
  const header =
    env.VERCEL === "1"
      ? "x-vercel-forwarded-for"
      : env.BOOKING_CLIENT_IP_HEADER;
  if (!header || !/^[a-z0-9-]+$/i.test(header)) return null;
  const value = headers.get(header)?.trim();
  // Reject chains rather than selecting a client-supplied position within one.
  if (!value) return null;
  const version = isIP(value);
  if (version === 4) return value;
  // IPv6 has multiple equivalent spellings; canonicalize before hashing.
  return version === 6 ? new URL(`http://[${value}]/`).hostname : null;
}

export async function checkBookingLimit(
  operation: BookingOperation,
  headers: Headers,
  options: {
    now?: () => Date;
    counter?: Counter;
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<number | null> {
  const env = options.env ?? process.env;
  const ip = trustedCallerIp(headers, env);
  const secret = env.BOOKING_RATE_LIMIT_SECRET;
  if (!ip || !secret || secret.length < 32)
    throw new Error("Booking limiter is not configured");
  const key = createHmac("sha256", secret).update(ip).digest("hex");
  const now = (options.now ?? (() => new Date()))();
  const { request_count, expires_at } = await (
    options.counter ?? postgresCounter
  )(operation, key, now, BOOKING_WINDOW_MS);
  return request_count > BOOKING_LIMITS[operation]
    ? Math.max(1, Math.ceil((expires_at.getTime() - now.getTime()) / 1000))
    : null;
}

export async function bookingLimitResponse(
  request: NextRequest,
  operation: BookingOperation
): Promise<NextResponse | null> {
  try {
    const retry = await checkBookingLimit(operation, request.headers);
    if (retry === null) return null;
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retry), "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Booking request limit unavailable:", error);
    return NextResponse.json(
      { success: false, error: "Booking service temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
