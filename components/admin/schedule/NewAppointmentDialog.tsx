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

  // The only time known to be real right now is the one the schedule handed
  // over. DT-488 fills this from the day's live availability; the control, its
  // "3:00 PM" value format and its state all stay exactly as they are.
  const timeOptions = request.time ? [request.time] : [];

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
            disabled={timeOptions.length === 0}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={FIELD}
          >
            <option value="">Select a time</option>
            {timeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {timeOptions.length === 0 && (
            <p className={HINT}>Pick a slot on the schedule to choose a time.</p>
          )}
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
          className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#936f50] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:ring-offset-2 focus-visible:outline-none"
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
