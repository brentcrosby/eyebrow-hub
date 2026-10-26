import { useEffect, useRef, useState } from "react";
import {
  CONFIRMED_STATUS,
  getStatusBadgeClasses,
  getStatusLabel,
  PENDING_STATUS,
} from "@/lib/appointmentStatus";
import { getSourceLabel } from "@/lib/appointmentSource";

export type AppointmentDetail = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  service: {
    name: string;
    durationMinutes: number;
    price: number | string;
  };
  stylist?: {
    name: string;
  } | null;
  startTime: string;
  endTime: string;
  source?: string | null;
  status: string;
  notes?: string | null;
};

type AppointmentDetailPanelProps = {
  appointment: AppointmentDetail;
  onApprove?: (signal?: AbortSignal) => void | Promise<void>;
  onReject?: (reason?: string, signal?: AbortSignal) => void | Promise<void>;
  onCancel?: (signal?: AbortSignal) => void | Promise<void>;
  onComplete?: (signal?: AbortSignal) => void | Promise<void>;
  onClose?: () => void;
};

type AppointmentAction = "approve" | "reject" | "cancel" | "complete";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPrice(price: number | string) {
  const numericPrice =
    typeof price === "string" && !price.trim() ? Number.NaN : Number(price);

  return Number.isFinite(numericPrice)
    ? numericPrice.toLocaleString([], {
        style: "currency",
        currency: "USD",
      })
    : "Price unavailable";
}

function formatDuration(durationMinutes: number) {
  return Number.isFinite(durationMinutes) && durationMinutes > 0
    ? `${durationMinutes} minutes`
    : "Duration unavailable";
}

function phoneHref(phone: string) {
  const phoneNumber = phone.replace(/[^\d+]/g, "");

  return /\d/.test(phoneNumber) ? `tel:${phoneNumber}` : null;
}

export default function AppointmentDetailPanel({
  appointment,
  onApprove,
  onReject,
  onCancel,
  onComplete,
  onClose,
}: AppointmentDetailPanelProps) {
  const [pendingAction, setPendingAction] = useState<AppointmentAction | null>(
    null
  );
  const pendingRequest = useRef<AbortController | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<
    "cancel" | "complete" | null
  >(null);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);
  const customerName = appointment.customerName.trim() || "Unnamed customer";
  const serviceName = appointment.service.name.trim() || "Service unavailable";
  const stylistName = appointment.stylist?.name.trim() || "No stylist assigned";
  const sourceLabel = appointment.source?.trim()
    ? getSourceLabel(appointment.source)
    : "Source unavailable";
  const phoneLink = phoneHref(appointment.customerPhone);
  const email = appointment.customerEmail?.trim() || null;
  const statusLabel = getStatusLabel(appointment.status);
  const isPending = appointment.status.trim().toLowerCase() === PENDING_STATUS;
  const isConfirmed =
    appointment.status.trim().toLowerCase() === CONFIRMED_STATUS;

  const runAction = async (
    action: AppointmentAction,
    callback: ((signal?: AbortSignal) => void | Promise<void>) | undefined
  ) => {
    if (!callback || pendingRequest.current) return;

    const request = new AbortController();
    pendingRequest.current = request;
    setPendingAction(action);
    setActionError(null);

    try {
      await callback(request.signal);
      if (request.signal.aborted) return;
      setConfirmationAction(null);
      setShowRejectPrompt(false);
      setRejectionReason("");
    } catch (error) {
      if (request.signal.aborted) return;
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? error.status
          : undefined;
      const message =
        status === 401
          ? "Your session has expired. Sign in again to view appointment details."
          : status === 403
            ? "You no longer have access to appointment details."
            : status === 409
              ? "This appointment has changed. Close and reopen the details to see its current status."
              : status === 404
                ? "This appointment is no longer available."
                : status === 0
                  ? "Unable to load the latest appointment details. Close and reopen them before trying again."
                  : null;
      if (message) {
        setDetailError(message);
      } else {
        setActionError(
          error instanceof Error
            ? error.message
            : "Unable to update appointment status"
        );
      }
    } finally {
      pendingRequest.current = null;
      if (!request.signal.aborted) setPendingAction(null);
    }
  };

  if (detailError) {
    return (
      <p role="alert" className="px-5 py-5 text-sm text-red-700">
        {detailError}
      </p>
    );
  }

  return (
    <aside
      aria-label={`Appointment details for ${customerName}`}
      className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffaf4] shadow-sm"
    >
      <div className="border-b border-[#e8dac9] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a08a75]">
              Appointment
            </p>
            <h2 className="mt-1 wrap-break-word text-xl font-semibold text-[#7a5a3c]">
              {customerName}
            </h2>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClasses(
              appointment.status
            )}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <dl className="grid gap-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Service</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">{serviceName}</dd>
          <dd className="mt-1 text-xs text-[#a08a75]">
            {formatDuration(appointment.service.durationMinutes)} ·{" "}
            {formatPrice(appointment.service.price)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Stylist</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">{stylistName}</dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Starts</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">
            {formatDateTime(appointment.startTime)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Ends</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">
            {formatDateTime(appointment.endTime)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Source</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">{sourceLabel}</dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Notes</dt>
          <dd className="mt-1 wrap-break-word whitespace-pre-wrap text-[#5e4735]">
            {appointment.notes?.trim() || "No notes"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-[#e8dac9] px-5 py-4 sm:px-6">
        {isPending && onApprove && (
          <button
            type="button"
            onClick={() => void runAction("approve", onApprove)}
            disabled={pendingAction !== null}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#2f7d5a] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#286d4d] focus-visible:ring-2 focus-visible:ring-[#2f7d5a] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingAction === "approve" ? "Working…" : "Approve"}
          </button>
        )}

        {isPending && onReject && !showRejectPrompt && (
          <button
            type="button"
            onClick={() => setShowRejectPrompt(true)}
            disabled={pendingAction !== null}
            className="inline-flex min-h-10 items-center rounded-xl border border-[#d8c4ae] bg-white px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        )}

        {isPending && onReject && showRejectPrompt && (
          <div className="w-full space-y-3 rounded-xl border border-[#e8dac9] bg-white p-3">
            <label className="block text-sm font-medium text-[#7a5a3c]">
              Rejection reason
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={3}
                disabled={pendingAction !== null}
                className="mt-1 w-full rounded-lg border border-[#d8c4ae] bg-[#fffaf4] px-3 py-2 text-sm text-[#5e4735] placeholder:text-[#a08a75] focus:border-[#7a5a3c] focus:outline-none"
                placeholder="Add the reason for rejecting this appointment"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const reason = rejectionReason.trim();
                  if (!reason) {
                    setActionError("A rejection reason is required.");
                    return;
                  }
                  void runAction("reject", (signal) =>
                    onReject(reason, signal)
                  );
                }}
                disabled={pendingAction !== null}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#7a5a3c] px-3 py-2 text-sm font-medium text-white hover:bg-[#69513a] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === "reject" ? "Working…" : "Confirm rejection"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRejectPrompt(false);
                  setRejectionReason("");
                  setActionError(null);
                }}
                disabled={pendingAction !== null}
                className="inline-flex min-h-10 items-center rounded-xl border border-[#d8c4ae] bg-white px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isConfirmed && !confirmationAction && (
          <>
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmationAction("cancel");
                }}
                disabled={pendingAction !== null}
                className="inline-flex min-h-10 items-center rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel appointment
              </button>
            )}
            {onComplete && (
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmationAction("complete");
                }}
                disabled={pendingAction !== null}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#2f7d5a] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#286d4d] focus-visible:ring-2 focus-visible:ring-[#2f7d5a] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                Complete appointment
              </button>
            )}
          </>
        )}

        {isConfirmed &&
          confirmationAction &&
          (confirmationAction === "cancel" ? onCancel : onComplete) && (
            <div
              role="group"
              aria-label={
                confirmationAction === "cancel"
                  ? "Cancel appointment confirmation"
                  : "Complete appointment confirmation"
              }
              className="w-full space-y-3 rounded-xl border border-[#e8dac9] bg-white p-3"
            >
              <p className="text-sm font-medium text-[#7a5a3c]">
                {confirmationAction === "cancel"
                  ? "Cancel this confirmed appointment?"
                  : "Mark this appointment as completed?"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void runAction(
                      confirmationAction,
                      confirmationAction === "cancel" ? onCancel : onComplete
                    )
                  }
                  disabled={pendingAction !== null}
                  className="inline-flex min-h-10 items-center rounded-xl bg-[#7a5a3c] px-3 py-2 text-sm font-medium text-white hover:bg-[#69513a] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === confirmationAction
                    ? "Working…"
                    : confirmationAction === "cancel"
                      ? "Confirm cancellation"
                      : "Confirm completion"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmationAction(null);
                    setActionError(null);
                  }}
                  disabled={pendingAction !== null}
                  className="inline-flex min-h-10 items-center rounded-xl border border-[#d8c4ae] bg-white px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Go back
                </button>
              </div>
            </div>
          )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={pendingAction !== null}
            className="inline-flex min-h-10 items-center rounded-xl border border-[#d8c4ae] px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        )}

        {actionError && (
          <p className="w-full text-sm text-red-700" role="alert">
            {actionError}
          </p>
        )}

        {phoneLink ? (
          <a
            href={phoneLink}
            className="inline-flex min-h-10 max-w-full items-center break-all rounded-xl border border-[#d8c4ae] px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none"
          >
            Call {appointment.customerPhone.trim()}
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-xl border border-[#eadfce] px-3 py-2 text-sm text-[#a08a75]">
            No phone provided
          </span>
        )}

        {email ? (
          <a
            href={`mailto:${encodeURIComponent(email)}`}
            className="inline-flex min-h-10 max-w-full items-center break-all rounded-xl border border-[#d8c4ae] px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none"
          >
            Email {email}
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-xl border border-[#eadfce] px-3 py-2 text-sm text-[#a08a75]">
            No email provided
          </span>
        )}
      </div>
    </aside>
  );
}
