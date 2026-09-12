-- Backfill migration.
--
-- These tables already exist on the shared dev database — someone ran
-- `prisma migrate dev` against it for P5-S7 (persisted business hours and
-- scheduling rules) but the generated migration folder was never committed
-- to git, which left this repo's migration history out of sync with the
-- live database. This file recreates that migration from the live schema
-- (via `prisma db pull`) using the same name Prisma already recorded as
-- applied, so migration history matches reality again.
--
-- IF NOT EXISTS, matching the Stylist migration's convention, so this is a
-- no-op on the shared dev database and a real create on any other one.

-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessHour" (
    "id" SERIAL NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "openMinutes" INTEGER NOT NULL,
    "closeMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessHour_dayOfWeek_key" ON "BusinessHour"("dayOfWeek");

-- CreateTable
CREATE TABLE IF NOT EXISTS "SchedulingRule" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minimumNoticeMinutes" INTEGER NOT NULL DEFAULT 120,
    "maximumAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingRule_pkey" PRIMARY KEY ("id")
);
