import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isolatedDatabaseUrl } from "../scripts/dt524-test-db.mjs";

export function localFixture() {
  const url = isolatedDatabaseUrl();
  const secret = process.env.BOOKING_RATE_LIMIT_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    process.env.BOOKING_CLIENT_IP_HEADER !== "x-trusted-client-ip" ||
    process.env.VERCEL
  ) {
    throw new Error(
      "Local fixture requires a local secret, x-trusted-client-ip, and no VERCEL mode"
    );
  }
  const port = Number(process.env.DT524_PROXY_PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid proxy port");
  const callerKey = createHmac("sha256", secret)
    .update("127.0.0.1")
    .digest("hex");
  return {
    db: new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }),
    callerKey,
    baseURL: `http://127.0.0.1:${port}`,
  };
}

export async function clearBucket(db, operation, callerKey) {
  await db.$executeRaw`DELETE FROM "booking_request_limits" WHERE "operation" = ${operation} AND "caller_key" = ${callerKey}`;
}

export async function expireBucket(db, operation, callerKey) {
  const changed =
    await db.$executeRaw`UPDATE "booking_request_limits" SET "expires_at" = ${new Date(Date.now() - 1000)} WHERE "operation" = ${operation} AND "caller_key" = ${callerKey}`;
  if (changed !== 1)
    throw new Error(
      `No ${operation} bucket for loopback caller; check trusted proxy configuration`
    );
}
