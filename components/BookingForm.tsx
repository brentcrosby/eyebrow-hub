"use client";

import { useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  BOOKING_LIMITS,
  bookingContactSchemas,
  type BookingSelection,
} from "@/lib/validations/booking";
import type { BookingConfirmation } from "./BookingContainer";
import { bookingRetryMessage } from "@/lib/bookingRetry";

type Service = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
};

type Stylist = {
  id: number;
  name: string;
};

interface BookingFormProps {
  selection: BookingSelection | null;
  services: Service[];
  stylists: Stylist[];
  onBook: (booking: BookingConfirmation) => void;
  onBack: () => void;
  onTimeConflict: (message: string) => void;
  contact: BookingContact;
  onContactChange: Dispatch<SetStateAction<BookingContact>>;
  touched: BookingTouched;
  onTouchedChange: Dispatch<SetStateAction<BookingTouched>>;
  selectionReady: boolean;
}

export type BookingContact = { name: string; email: string; phone: string; notes: string };
export type BookingTouched = { name: boolean; email: boolean; phone: boolean; notes: boolean };

function formatPhone(raw: string): string {
  // Keep invalid pasted input visible so the shared validator can explain it.
  if (raw.length > BOOKING_LIMITS.phone || raw.replace(/\D/g, "").length > 10)
    return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function fieldError(
  field: keyof typeof bookingContactSchemas,
  value: string
): string | null {
  const result = bookingContactSchemas[field].safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

function FormField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor={id} className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="px-4 py-4 w-full rounded-lg bg-white text-[14px] leading-[17px] text-black placeholder:text-black/50 outline-none focus:ring-1 focus:ring-black/20"
        style={{
          border: `1px solid ${
            error ? "rgba(220,38,38,0.4)" : "rgba(0,0,0,0.1)"
          }`,
        }}
      />

      {error && (
        <span id={`${id}-error`} className="text-[12px] leading-[15px] text-red-500">{error}</span>
      )}
    </div>
  );
}

export default function BookingForm({
  selection,
  services,
  stylists,
  onBook,
  onBack,
  onTimeConflict,
  contact,
  onContactChange,
  touched,
  onTouchedChange,
  selectionReady,
}: BookingFormProps) {
  const { name, email, phone, notes } = contact;
  const setField = (field: keyof BookingContact, value: string) =>
    onContactChange((previous) => ({ ...previous, [field]: value }));
  const touch = (field: keyof BookingTouched) =>
    onTouchedChange((previous) => ({ ...previous, [field]: true }));

  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedServices = selection
    ? services.filter((service) => selection.serviceIds.includes(service.id))
    : [];

  const selectedStylist =
    selection?.stylistId == null
      ? null
      : (stylists.find((stylist) => stylist.id === selection.stylistId) ??
        null);

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );

  const nameValidation = fieldError("name", name);
  const emailValidation = fieldError("email", email);
  const phoneValidation = fieldError("phone", phone);
  const notesValidation = fieldError("notes", notes);
  const nameError =
    touched.name || name.length > BOOKING_LIMITS.name ? nameValidation : null;
  const emailError =
    touched.email || email.length > BOOKING_LIMITS.email
      ? emailValidation
      : null;
  const phoneError =
    touched.phone || phone.length > BOOKING_LIMITS.phone
      ? phoneValidation
      : null;
  const notesError =
    touched.notes || notes.length > BOOKING_LIMITS.notes
      ? notesValidation
      : null;

  const canBook =
    selection !== null &&
    selectionReady &&
    !submitting &&
    nameValidation === null &&
    emailValidation === null &&
    phoneValidation === null &&
    notesValidation === null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    onTouchedChange((previous) => ({
      ...previous,
      name: true,
      email: true,
      phone: true,
      notes: true,
    }));

    setSubmitError(null);

    if (!selection || !canBook) return;

    inFlight.current = true;
    try {
      setSubmitting(true);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selection,
          name,
          email,
          phone,
          notes,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 429) {
          setSubmitError(bookingRetryMessage(res.headers.get("Retry-After")));
          return;
        }
        if (res.status === 409 && typeof body?.errors?.time === "string") {
          onTimeConflict(body.errors.time);
          return;
        }
        const firstError =
          body?.errors && typeof body.errors === "object"
            ? Object.values(body.errors).flat()[0]
            : null;

        setSubmitError(
          typeof firstError === "string"
            ? firstError
            : (body?.error ?? "Could not submit booking. Please try again.")
        );

        return;
      }

      onBook(body.booking);
    } catch (error) {
      console.error("Failed to submit booking:", error);
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      {selection && selectedServices.length > 0 && (
        <div
          className="flex flex-col gap-3 p-4 rounded-lg bg-[#F8F5F2]"
          style={{ border: "1px solid rgba(0,0,0,0.05)" }}
        >
          <h3 className="text-[15px] font-medium text-black">
            Booking Summary
          </h3>

          <p className="text-[14px] text-black/70">
            <span className="font-medium text-black">Services:</span>{" "}
            {selectedServices.map((service) => service.name).join(", ")}
          </p>

          <p className="text-[14px] text-black/70">
            <span className="font-medium text-black">Stylist:</span>{" "}
            {selectedStylist?.name ?? "Next Available"}
          </p>

          <p className="text-[14px] text-black/70">
            <span className="font-medium text-black">Date:</span>{" "}
            {selection.date}
          </p>

          <p className="text-[14px] text-black/70">
            <span className="font-medium text-black">Time:</span>{" "}
            {selection.time}
          </p>

          <p className="text-[14px] text-black/70">
            <span className="font-medium text-black">Total:</span>{" "}
            {totalPrice === 0 ? "Free" : `$${totalPrice.toFixed(2)}`}
          </p>
        </div>
      )}

      <FormField
        id="booking-name"
        label="Name"
        placeholder="Full name"
        value={name}
        onChange={(value) => setField("name", value)}
        onBlur={() => touch("name")}
        error={nameError}
      />

      <FormField
        id="booking-email"
        label="Email"
        type="email"
        placeholder="name@email.com"
        value={email}
        onChange={(value) => setField("email", value)}
        onBlur={() => touch("email")}
        error={emailError}
      />

      <FormField
        id="booking-phone"
        label="Phone"
        type="tel"
        placeholder="(000) 000-0000"
        value={phone}
        onChange={(raw) => setField("phone", formatPhone(raw))}
        onBlur={() => touch("phone")}
        error={phoneError}
      />

      <div className="flex flex-col gap-2 w-full">
        <label
          htmlFor="booking-notes"
          className="text-[14px] leading-[17px] font-medium text-black"
        >
          Notes <span className="font-normal text-black/50">(optional)</span>
        </label>

        <textarea
          id="booking-notes"
          placeholder="Anything we should know before your appointment?"
          value={notes}
          onChange={(event) => setField("notes", event.target.value)}
          onBlur={() => touch("notes")}
          aria-invalid={notesError ? "true" : undefined}
          aria-describedby={notesError ? "booking-notes-error" : undefined}
          rows={4}
          className="px-4 py-4 w-full rounded-lg bg-white text-[14px] leading-[17px] text-black placeholder:text-black/50 outline-none focus:ring-1 focus:ring-black/20 resize-y"
          style={{
            border: `1px solid ${
              notesError ? "rgba(220,38,38,0.4)" : "rgba(0,0,0,0.1)"
            }`,
          }}
        />

        <div className="flex justify-between gap-3 text-[12px] leading-[15px]">
          {notesError ? (
            <span id="booking-notes-error" className="text-red-500">
              {notesError}
            </span>
          ) : (
            <span className="text-black/50">Optional</span>
          )}
          <span className="ml-auto text-black/50">
            {notes.length}/{BOOKING_LIMITS.notes}
          </span>
        </div>
      </div>

      {submitError && (
        <p className="text-[12px] leading-[15px] text-red-500 w-full">
          {submitError}
        </p>
      )}

      <p className="text-[14px] leading-[22px] text-black/50">
        Cancellation Policy: Please cancel or reschedule at least 4 hours before
        your appointment time.
      </p>

      <button
        type="submit"
        disabled={!canBook}
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white"
        style={{
          backgroundColor: "#6B4F3A",
          opacity: canBook ? 1 : 0.25,
          cursor: canBook ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "Booking…" : "Book Appointment"}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-black cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        Back
      </button>
    </form>
  );
}
