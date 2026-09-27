"use client";

import ScheduleDialog from "./ScheduleDialog";

export type NewAppointmentRequest = {
  date: string;
  time: string | null;
};

type NewAppointmentDialogProps = {
  request: NewAppointmentRequest | null;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
};

export default function NewAppointmentDialog({
  request,
  onClose,
  onCreated: _onCreated,
}: NewAppointmentDialogProps) {
  // The manual-booking form replaces this body and invokes onCreated after a
  // successful POST. Keeping that seam here avoids changes to either grid.
  void _onCreated;

  return (
    <ScheduleDialog
      open={request !== null}
      title="Add appointment"
      onClose={onClose}
    >
      {request && (
        <div className="space-y-5 bg-white px-5 py-6 sm:px-6">
          <p className="text-sm leading-6 text-[#5e4735]">
            The selected schedule time is ready for the manual-booking form. The
            form will replace this temporary handoff without changing the
            schedule interaction.
          </p>

          <dl className="grid gap-4 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-[#a08a75]">Date</dt>
              <dd className="mt-1 text-[#5e4735]">{request.date}</dd>
            </div>
            <div>
              <dt className="font-medium text-[#a08a75]">Time</dt>
              <dd className="mt-1 text-[#5e4735]">
                {request.time ?? "No time selected"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </ScheduleDialog>
  );
}
