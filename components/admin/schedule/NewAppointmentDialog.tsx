"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  CANCELLED_STATUS,
  COMPLETED_STATUS,
  CONFIRMED_STATUS,
  PENDING_STATUS,
  getStatusLabel,
} from "@/lib/appointmentStatus";
import { BOOKING_LIMITS } from "@/lib/validations/booking";
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

type ServiceOption = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
};

type StylistOption = {
  id: number;
  name: string;
};

type AvailableTime = {
  time: string;
  available: boolean;
};

// Same order as the enum in lib/validations/manualAppointment.ts.
const STATUS_OPTIONS = [
  PENDING_STATUS,
  CONFIRMED_STATUS,
  COMPLETED_STATUS,
  CANCELLED_STATUS,
];

const FIELD =
  "w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c] disabled:cursor-not-allowed disabled:bg-[#f6f1ea]";
const LABEL = "mb-1 block text-sm font-medium text-[#5e4735]";
const HINT = "mt-1 text-xs text-[#a08a75]";
const OPTIONAL = "font-normal text-[#a08a75]";
const ERROR_TEXT = "mt-1 text-xs text-red-700";

/**
 * Formats digits as they are typed into (530) 512-1111, capped at ten digits.
 * Mirrors the customer booking form so both flows store the same shape; the
 * API strips non-digits before validating, so the punctuation is cosmetic.
 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * The endpoint answers with a string[] for Zod failures but a plain string for
 * its own checks, so both shapes are flattened to one message per field.
 */
function toFieldErrors(errors: unknown): Record<string, string> {
  if (!errors || typeof errors !== "object") return {};

  const result: Record<string, string> = {};

  for (const [field, value] of Object.entries(errors)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      result[field] = value[0];
    } else if (typeof value === "string") {
      result[field] = value;
    }
  }

  return result;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className={ERROR_TEXT}>
      {message}
    </p>
  );
}

export function AppointmentForm({
  request,
  onClose,
  onCreated,
}: {
  request: NewAppointmentRequest;
  onClose: () => void;
  onCreated: (message: string) => void;
}) {
  const fieldId = useId();

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [stylists, setStylists] = useState<StylistOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // null means "not asked yet", which is different from an empty list meaning
  // "asked, and the salon has nothing that day".
  const [times, setTimes] = useState<AvailableTime[] | null>(null);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [availabilityRefreshId, setAvailabilityRefreshId] = useState(0);

  const [serviceId, setServiceId] = useState("");
  // "" is a real choice, not a missing one: the endpoint accepts a null
  // stylistId for a booking nobody is assigned to yet.
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(request.date);
  const [time, setTime] = useState(request.time ?? "");
  const [status, setStatus] = useState<string>(CONFIRMED_STATUS);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Both endpoints already filter to active rows, so whatever comes back can
  // be offered as-is.
  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const [servicesResponse, stylistsResponse] = await Promise.all([
          fetch("/api/services", { signal: controller.signal }),
          fetch("/api/stylists", { signal: controller.signal }),
        ]);

        if (!servicesResponse.ok || !stylistsResponse.ok) {
          throw new Error("Services or stylists could not be loaded.");
        }

        const [serviceData, stylistData] = await Promise.all([
          servicesResponse.json(),
          stylistsResponse.json(),
        ]);

        setServices(serviceData);
        setStylists(stylistData);
        setIsLoadingOptions(false);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") return;

        // No invented fallback list: offering a service that might not exist
        // would only move the failure to submit time.
        setOptionsError("Services and stylists could not be loaded.");
        setIsLoadingOptions(false);
      }
    }

    loadOptions();

    return () => controller.abort();
  }, []);

  const selectedService =
    services.find((service) => String(service.id) === serviceId) ?? null;
  const duration = selectedService?.durationMinutes;

  // Availability is asked for per date and per service duration, because a
  // 15-minute service and a 90-minute one do not fit the same gaps. The
  // endpoint takes no stylistId, so this list is salon-wide: a time is offered
  // only when nobody at all is booked into it.
  useEffect(() => {
    if (!date || duration === undefined) {
      setTimes(null);
      setTimesError(null);
      setIsLoadingTimes(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingTimes(true);
    setTimesError(null);

    async function loadTimes() {
      try {
        const response = await fetch(
          `/api/availability/times?date=${date}&duration=${duration}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Available times could not be loaded.");
        }

        const data: AvailableTime[] = await response.json();

        setTimes(data);
        // Keep a still-valid choice (the slot the schedule handed over usually
        // survives) and drop one the new day or duration has invalidated, so a
        // stale time can never be submitted.
        setTime((current) =>
          data.some((slot) => slot.time === current && slot.available)
            ? current
            : ""
        );
        setIsLoadingTimes(false);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") return;

        setTimes(null);
        setTime("");
        setTimesError("Available times could not be loaded.");
        setIsLoadingTimes(false);
      }
    }

    loadTimes();

    return () => controller.abort();
  }, [availabilityRefreshId, date, duration]);

  // Before a service is picked there is no duration to ask about, so the only
  // time on offer is the one the schedule handed over.
  const timeOptions: AvailableTime[] =
    times ?? (request.time ? [{ time: request.time, available: true }] : []);

  // AC: never submit against times that are loading, failed, or unchosen.
  const canSubmit = !isLoadingTimes && timesError === null && time !== "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Belt and braces with the disabled button: a keyboard submit while a
    // request is in flight would otherwise create a second appointment.
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: Number(serviceId),
          // "" is the "No stylist" option, which the endpoint takes as null.
          stylistId: stylistId ? Number(stylistId) : null,
          date,
          time,
          customerName,
          customerPhone,
          customerEmail: customerEmail.trim() || null,
          notes: notes.trim() || null,
          status,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok) {
        onCreated(`${customerName.trim()} is booked for ${time}.`);
        return;
      }

      if (payload?.errors) {
        setFieldErrors(toFieldErrors(payload.errors));
      }

      if (response.status === 409) {
        // Keep every customer and appointment field, but immediately reject
        // the stale time and ask for the day again through the existing
        // abortable availability effect. Submission stays disabled until the
        // refresh succeeds and staff select a new available time.
        setTime("");
        setTimes([]);
        setTimesError(null);
        setIsLoadingTimes(true);
        setAvailabilityRefreshId((current) => current + 1);
        setFormError(
          "That time was taken while you were filling this in. Choose another time."
        );
      } else if (!payload?.errors) {
        setFormError(payload?.error ?? "The appointment could not be saved.");
      }
    } catch {
      setFormError("The appointment could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white px-5 py-6 sm:px-6">
      {optionsError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {optionsError}
        </p>
      )}

      {formError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {formError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor={`${fieldId}-name`}>
            Customer name
          </label>
          <input
            id={`${fieldId}-name`}
            type="text"
            autoFocus
            required
            maxLength={BOOKING_LIMITS.name}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.customerName)}
            aria-describedby={`${fieldId}-name-error`}
            className={FIELD}
          />
          <FieldError
            id={`${fieldId}-name-error`}
            message={fieldErrors.customerName}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-phone`}>
            Phone
          </label>
          <input
            id={`${fieldId}-phone`}
            type="tel"
            required
            inputMode="tel"
            maxLength={BOOKING_LIMITS.phone}
            placeholder="(000) 000-0000"
            value={customerPhone}
            // Reformatting on every keystroke, the same as the customer
            // booking form, so both flows store the same shape.
            onChange={(event) => setCustomerPhone(formatPhone(event.target.value))}
            aria-invalid={Boolean(fieldErrors.customerPhone)}
            aria-describedby={`${fieldId}-phone-error`}
            className={FIELD}
          />
          {fieldErrors.customerPhone ? (
            <FieldError
              id={`${fieldId}-phone-error`}
              message={fieldErrors.customerPhone}
            />
          ) : (
            <p className={HINT}>Formatted as you type.</p>
          )}
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-email`}>
            Email <span className={OPTIONAL}>(optional)</span>
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            maxLength={BOOKING_LIMITS.email}
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.customerEmail)}
            aria-describedby={`${fieldId}-email-error`}
            className={FIELD}
          />
          <FieldError
            id={`${fieldId}-email-error`}
            message={fieldErrors.customerEmail}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-service`}>
            Service
          </label>
          <select
            id={`${fieldId}-service`}
            required
            disabled={isLoadingOptions || services.length === 0}
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className={FIELD}
          >
            <option value="">
              {isLoadingOptions ? "Loading services" : "Select a service"}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.durationMinutes} min
              </option>
            ))}
          </select>
          <FieldError
            id={`${fieldId}-service-error`}
            message={fieldErrors.serviceId}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-stylist`}>
            Stylist <span className={OPTIONAL}>(optional)</span>
          </label>
          <select
            id={`${fieldId}-stylist`}
            disabled={isLoadingOptions}
            value={stylistId}
            onChange={(event) => setStylistId(event.target.value)}
            className={FIELD}
          >
            <option value="">No stylist</option>
            {stylists.map((stylist) => (
              <option key={stylist.id} value={stylist.id}>
                {stylist.name}
              </option>
            ))}
          </select>
          <FieldError
            id={`${fieldId}-stylist-error`}
            message={fieldErrors.stylistId}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-date`}>
            Date
          </label>
          <input
            id={`${fieldId}-date`}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(fieldErrors.date)}
            aria-describedby={`${fieldId}-date-error`}
            className={FIELD}
          />
          <FieldError id={`${fieldId}-date-error`} message={fieldErrors.date} />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-time`}>
            Time
          </label>
          <select
            id={`${fieldId}-time`}
            required
            disabled={
              isLoadingTimes || timesError !== null || timeOptions.length === 0
            }
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={FIELD}
          >
            <option value="">
              {isLoadingTimes ? "Loading times" : "Select a time"}
            </option>
            {/* Taken slots stay listed but disabled, so staff can see that the
                time exists and is spoken for rather than wondering where it went. */}
            {timeOptions.map((slot) => (
              <option key={slot.time} value={slot.time} disabled={!slot.available}>
                {slot.available ? slot.time : `${slot.time} (unavailable)`}
              </option>
            ))}
          </select>
          {fieldErrors.time ? (
            // Where a 409 lands: the slot went while this form was open.
            <FieldError
              id={`${fieldId}-time-error`}
              message={fieldErrors.time}
            />
          ) : timesError ? (
            <p role="alert" className={ERROR_TEXT}>
              {timesError}
            </p>
          ) : !serviceId ? (
            <p className={HINT}>Choose a service to see the day&apos;s times.</p>
          ) : times?.length === 0 ? (
            <p className={HINT}>No times are open on this day.</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor={`${fieldId}-status`}>
            Status
          </label>
          <select
            id={`${fieldId}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={FIELD}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {getStatusLabel(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL} htmlFor={`${fieldId}-notes`}>
            Notes <span className={OPTIONAL}>(optional)</span>
          </label>
          <textarea
            id={`${fieldId}-notes`}
            rows={3}
            maxLength={BOOKING_LIMITS.notes}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            aria-invalid={Boolean(fieldErrors.notes)}
            aria-describedby={`${fieldId}-notes-error`}
            className={`${FIELD} rounded-2xl`}
          />
          <FieldError
            id={`${fieldId}-notes-error`}
            message={fieldErrors.notes}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-full border border-[#d8c4ae] px-4 py-2 text-sm font-medium text-[#7a5a3c] transition-colors hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#936f50] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#c3ac95]"
        >
          {isSubmitting ? "Saving" : "Save appointment"}
        </button>
      </div>
    </form>
  );
}

export default function NewAppointmentDialog({
  request,
  onClose,
  onCreated,
}: NewAppointmentDialogProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;

    const timer = setTimeout(() => setConfirmation(null), 6000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  // onCreated is the page's: it closes this dialog and silently reloads the
  // day, so the new appointment appears without a manual refresh.
  async function handleCreated(message: string) {
    setConfirmation(message);
    await onCreated?.();
  }

  return (
    <>
      <ScheduleDialog
        open={request !== null}
        title="Add appointment"
        onClose={onClose}
      >
        {/* Mounted only while open, so every open starts from empty fields
            rather than the previous customer's details. */}
        {request && (
          <AppointmentForm
            request={request}
            onClose={onClose}
            onCreated={handleCreated}
          />
        )}
      </ScheduleDialog>

      {/* Lives outside the dialog because the dialog is gone by the time this
          shows. role="status" so it is announced without stealing focus. */}
      {confirmation && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-[#cfe3d4] bg-[#f2faf4] px-4 py-3 text-sm text-[#2f5d3f] shadow-lg sm:inset-x-auto sm:right-6 sm:max-w-sm"
        >
          {confirmation}
        </div>
      )}
    </>
  );
}
