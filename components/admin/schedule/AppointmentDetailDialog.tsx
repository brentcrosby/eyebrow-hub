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
  onStatusChange: _onStatusChange,
}: AppointmentDetailDialogProps) {
  // Future appointment status controls should invoke onStatusChange after a
  // successful mutation so the selected range refreshes without closing first.
  void _onStatusChange;

  return (
    <ScheduleDialog
      open={appointment !== null}
      title="Appointment details"
      onClose={onClose}
    >
      {appointment && <AppointmentDetailPanel appointment={appointment} />}
    </ScheduleDialog>
  );
}
