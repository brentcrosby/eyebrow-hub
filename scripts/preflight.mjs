// Checks the settings a deployment needs before the app is used.
// Run with `npm run preflight`. It reports setting names, never their values.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

// Supabase "User UID" values are UUIDs.
const SUPABASE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The same rule lib/bookingRateLimit.ts applies to the header name.
const HEADER_NAME = /^[a-z0-9-]+$/i;
// Headers a client can send or a proxy appends to: only safe if the ingress overwrites them.
const CLIENT_SETTABLE_HEADERS = new Set(["x-forwarded-for", "x-real-ip", "forwarded"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function checkEnvironment(env) {
  const errors = [];
  const warnings = [];

  const databaseUrl = parseUrl(env.DATABASE_URL ?? "");
  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is missing. Booking, admin and the limiter all need the database.");
  } else if (!databaseUrl || !["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    errors.push("DATABASE_URL is not a postgresql:// connection string.");
  }

  const supabaseUrl = parseUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is missing. Admin login needs it.");
  } else if (
    !supabaseUrl ||
    !(supabaseUrl.protocol === "https:" ||
      (supabaseUrl.protocol === "http:" && LOCAL_HOSTS.has(supabaseUrl.hostname)))
  ) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL must be an https:// URL (http:// only for localhost).");
  }

  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Admin login needs it.");
  }

  const adminIds = (env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (adminIds.length === 0) {
    errors.push("ADMIN_USER_IDS is empty, so no one can sign in to admin.");
  }
  adminIds.forEach((id, index) => {
    if (!SUPABASE_USER_ID.test(id)) {
      errors.push(
        `ADMIN_USER_IDS entry ${index + 1} is not a Supabase user ID. Use the User UID from Supabase > Authentication > Users, not an email.`
      );
    }
  });

  const secret = env.BOOKING_RATE_LIMIT_SECRET ?? "";
  if (!secret) {
    errors.push("BOOKING_RATE_LIMIT_SECRET is missing. Booking and admin login return 503 without it.");
  } else if (secret.length < 32) {
    errors.push(`BOOKING_RATE_LIMIT_SECRET must be at least 32 characters (it has ${secret.length}).`);
  }

  if (env.VERCEL !== "1") {
    const header = env.BOOKING_CLIENT_IP_HEADER ?? "";
    if (!header) {
      errors.push(
        "BOOKING_CLIENT_IP_HEADER is missing. Off Vercel, name the header your trusted proxy sets (locally: x-trusted-client-ip)."
      );
    } else if (secret && header === secret) {
      errors.push(
        "BOOKING_CLIENT_IP_HEADER holds the same value as BOOKING_RATE_LIMIT_SECRET. It should be a header name, e.g. x-trusted-client-ip."
      );
    } else if (!HEADER_NAME.test(header)) {
      errors.push("BOOKING_CLIENT_IP_HEADER must be a header name (letters, digits and dashes only).");
    } else if (CLIENT_SETTABLE_HEADERS.has(header.toLowerCase())) {
      warnings.push(
        `BOOKING_CLIENT_IP_HEADER is ${header.toLowerCase()}, which clients can send. Only use it if your ingress overwrites it with one IP.`
      );
    }
  }

  if (!env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    warnings.push("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set, so the location map won't show.");
  }

  if (env.ALLOW_DEMO_SEED) {
    warnings.push("ALLOW_DEMO_SEED is set. Remove it: it belongs on a single local seed command only.");
  }

  return { errors, warnings };
}

function main() {
  // Same precedence as Next.js: real environment first, then .env.local, then .env.
  config({ path: resolve(".env.local"), quiet: true });
  config({ path: resolve(".env"), quiet: true });

  const { errors, warnings } = checkEnvironment(process.env);
  for (const message of errors) console.error(`ERROR  ${message}`);
  for (const message of warnings) console.warn(`WARN   ${message}`);

  if (errors.length > 0) {
    console.error(`Preflight failed: ${errors.length} problem(s). See docs/staging-checklist.md.`);
    process.exit(1);
  }
  console.log(`Preflight passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
