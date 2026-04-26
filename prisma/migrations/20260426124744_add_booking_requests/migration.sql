-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "requestedDateTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_status_idx" ON "BookingRequest"("status");

-- CreateIndex
CREATE INDEX "BookingRequest_requestedDateTime_idx" ON "BookingRequest"("requestedDateTime");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
