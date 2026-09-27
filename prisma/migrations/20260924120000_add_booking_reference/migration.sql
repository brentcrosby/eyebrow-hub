-- Add an optional reference so existing appointments remain unchanged.
ALTER TABLE "Appointment" ADD COLUMN "bookingReference" TEXT;

-- References are shared by the appointments belonging to one booking,
-- so this lookup index must not be unique.
CREATE INDEX "Appointment_bookingReference_idx"
ON "Appointment"("bookingReference");