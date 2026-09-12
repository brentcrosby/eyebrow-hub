-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'online',
ADD COLUMN     "stylistId" INTEGER;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "Stylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
