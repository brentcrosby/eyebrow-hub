"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  CANCELLED_STATUS,
  COMPLETED_STATUS,
  CONFIRMED_STATUS,
  PENDING_STATUS,
  getStatusLabel,
} from "@/lib/appointmentStatus";
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

function AppointmentForm({
  request,
  onClose,
}: {
  request: NewAppointmentRequest;
  onClose: () => void;
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
  }, [date, duration]);

  // Before a service is picked there is no duration to ask about, so the only
  // time on offer is the one the schedule handed over.
  const timeOptions: AvailableTime[] =
    times ?? (request.time ? [{ time: request.time, available: true }] : []);

  // AC: never submit against times that are loading, failed, or unchosen.
  const canSubmit = !isLoadingTimes && timesError === null && time !== "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // DT-489 posts this to /api/admin/appointments and handles 400 and 409.
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
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className={FIELD}
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
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className={FIELD}
          />
          <p className={HINT}>10 digits. Spaces and dashes are fine.</p>
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-email`}>
            Email <span className={OPTIONAL}>(optional)</span>
          </label>
          <input
            id={`${fieldId}-email`}
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            className={FIELD}
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
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor={`${fieldId}-time`}>
            Time
          </label>
          <select
            id={`${fieldId}-time`}
            required
            disabled={isLoadingTimes || timeOptions.length === 0}
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
          {timesError ? (
            <p role="alert" className="mt-1 text-xs text-red-700">
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
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${FIELD} rounded-2xl`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#d8c4ae] px-4 py-2 text-sm font-medium text-[#7a5a3c] transition-colors hover:bg-[#f3ebe2] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#936f50] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#c3ac95]"
        >
          Save appointment
        </button>
      </div>
    </form>
  );
}

export default function NewAppointmentDialog({
  request,
  onClose,
  onCreated: _onCreated,
}: NewAppointmentDialogProps) {
  // DT-489 calls onCreated after a successful POST so the day refreshes.
  void _onCreated;

  return (
    <ScheduleDialog
      open={request !== null}
      title="Add appointment"
      onClose={onClose}
    >
      {/* Mounted only while open, so every open starts from empty fields
          rather than the previous customer's details. */}
      {request && <AppointmentForm request={request} onClose={onClose} />}
    </ScheduleDialog>
  );
}
