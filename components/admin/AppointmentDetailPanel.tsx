import {
  getStatusBadgeClasses,
  getStatusLabel,
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
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPrice(price: number | string) {
  const numericPrice = Number(price);

  return Number.isFinite(numericPrice)
    ? numericPrice.toLocaleString([], {
        style: "currency",
        currency: "USD",
      })
    : "Price unavailable";
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function AppointmentDetailPanel({
  appointment,
}: AppointmentDetailPanelProps) {
  const email = appointment.customerEmail?.trim() || null;
  const statusLabel = getStatusLabel(appointment.status);

  return (
    <aside
      aria-label={`Appointment details for ${appointment.customerName}`}
      className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffaf4] shadow-sm"
    >
      <div className="border-b border-[#e8dac9] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a08a75]">
              Appointment
            </p>
            <h2 className="mt-1 wrap-break-word text-xl font-semibold text-[#7a5a3c]">
              {appointment.customerName || "Unnamed customer"}
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
          <dd className="mt-1 wrap-break-word text-[#5e4735]">
            {appointment.service.name || "Service unavailable"}
          </dd>
          <dd className="mt-1 text-xs text-[#a08a75]">
            {appointment.service.durationMinutes} minutes ·{" "}
            {formatPrice(appointment.service.price)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Stylist</dt>
          <dd className="mt-1 wrap-break-word text-[#5e4735]">
            {appointment.stylist?.name || "No stylist assigned"}
          </dd>
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
          <dd className="mt-1 wrap-break-word text-[#5e4735]">
            {getSourceLabel(appointment.source)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="font-medium text-[#a08a75]">Notes</dt>
          <dd className="mt-1 wrap-break-word whitespace-pre-wrap text-[#5e4735]">
            {appointment.notes?.trim() || "No notes"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-[#e8dac9] px-5 py-4 sm:px-6">
        <a
          href={phoneHref(appointment.customerPhone)}
          className="inline-flex min-h-10 items-center rounded-xl border border-[#d8c4ae] px-3 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none"
        >
          Call {appointment.customerPhone || "customer"}
        </a>

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