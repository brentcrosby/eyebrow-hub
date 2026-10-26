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
  const refreshAfterFailure = async (signal?: AbortSignal) => {
    if (signal?.aborted) return;
    try {
      await onStatusChange?.();
    } catch {
      return;
    }
  };

  const handleStatusChange = async (
    status: "confirmed" | "rejected" | "cancelled" | "completed",
    reason?: string,
    signal?: AbortSignal
  ) => {
    if (!appointment || signal?.aborted) return;

    let response: Response;
    try {
      response = await fetch(
        `/api/admin/appointments/${appointment.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            status === "rejected" ? { status, reason } : { status }
          ),
          signal,
        }
      );
    } catch {
      if (signal?.aborted) return;
      await refreshAfterFailure(signal);
      throw Object.assign(
        new Error("Unable to confirm the appointment update"),
        {
          status: 0,
        }
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (signal?.aborted) return;

    if (!response.ok) {
      if ([401, 403, 404, 409].includes(response.status)) {
        await refreshAfterFailure(signal);
      }
      const errorMessage =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "Unable to update appointment status";
      throw Object.assign(new Error(errorMessage), { status: response.status });
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("success" in payload) ||
      payload.success !== true
    ) {
      await refreshAfterFailure(signal);
      throw Object.assign(
        new Error("Unable to confirm the appointment update"),
        {
          status: 0,
        }
      );
    }

    try {
      await onStatusChange?.();
    } catch {
      throw Object.assign(new Error("Unable to refresh appointment details"), {
        status: 0,
      });
    }
    if (!signal?.aborted) onClose();
  };

  return (
    <ScheduleDialog
      open={appointment !== null}
      title="Appointment details"
      onClose={onClose}
    >
      {appointment && (
        <AppointmentDetailPanel
          key={`${appointment.id}:${appointment.status}`}
          appointment={appointment}
          onApprove={(signal) =>
            handleStatusChange("confirmed", undefined, signal)
          }
          onReject={(reason, signal) =>
            handleStatusChange("rejected", reason, signal)
          }
          onCancel={(signal) =>
            handleStatusChange("cancelled", undefined, signal)
          }
          onComplete={(signal) =>
            handleStatusChange("completed", undefined, signal)
          }
        />
      )}
    </ScheduleDialog>
  );
}
