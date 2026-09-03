-- The Stylist model is in schema.prisma but was never in a migration, so a
-- database built from migrations alone has no Stylist table: `npm run seed`
-- fails and GET /api/stylists returns 500.
--
-- IF NOT EXISTS because existing environments already have this table from an
-- out-of-band `prisma db push`; this must be a no-op there and a fix on a
-- fresh database.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Stylist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stylist_pkey" PRIMARY KEY ("id")
);
