CREATE TABLE "booking_request_limits" (
  "operation" TEXT NOT NULL,
  "caller_key" TEXT NOT NULL,
  "request_count" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_request_limits_pkey" PRIMARY KEY ("operation", "caller_key")
);

CREATE INDEX "booking_request_limits_expires_at_idx" ON "booking_request_limits"("expires_at");