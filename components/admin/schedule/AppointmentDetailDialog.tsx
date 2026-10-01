"use client";

import AppointmentDetailPanel from "@/components/admin/AppointmentDetailPanel";
import type { ScheduleAppointment } from "./types";
import ScheduleDialog from "./ScheduleDialog";

type AppointmentDetailDialogProps = {
  appointment: ScheduleAppointment | null;
  onClose: () => void;
  onStatusChange?: () => void | Promise<void>;
};

export default function AppointmentDetailDialog({
  appointment,
  onClose,
  onStatusChange,
}: AppointmentDetailDialogProps) {
  const handleStatusChange = async (status: "confirmed" | "rejected") => {
    if (!appointment) return;

    const response = await fetch(
      `/api/admin/appointments/${appointment.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    const payload: unknown = await response.json().catch(() => null);
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to update appointment status";

    if (!response.ok) {
      if (response.status === 409) await onStatusChange?.();
      throw new Error(errorMessage);
    }

    await onStatusChange?.();
    onClose();
  };

  return (
    <ScheduleDialog
      open={appointment !== null}
      title="Appointment details"
      onClose={onClose}
    >
      {appointment && (
        <AppointmentDetailPanel
          appointment={appointment}
          onApprove={() => handleStatusChange("confirmed")}
          onReject={() => handleStatusChange("rejected")}
        />
      )}
    </ScheduleDialog>
  );
}
