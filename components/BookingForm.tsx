"use client";

import { useState } from "react";
import type { BookingSelection } from "@/lib/validations/booking";
import type { BookingConfirmation } from "./BookingContainer";

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
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validateName(name: string): string | null {
  return name.trim().length > 0 ? null : "Name is required";
}

function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? null
    : "Enter a valid email address";
}

function validatePhone(phone: string): string | null {
  return phone.replace(/\D/g, "").length === 10
    ? null
    : "Enter a 10-digit phone number";
}

function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
}: {
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
      <label className="text-[14px] leading-[17px] font-medium text-black">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="px-4 py-4 w-full rounded-lg bg-white text-[14px] leading-[17px] text-black placeholder:text-black/50 outline-none focus:ring-1 focus:ring-black/20"
        style={{
          border: `1px solid ${
            error ? "rgba(220,38,38,0.4)" : "rgba(0,0,0,0.1)"
          }`,
        }}
      />

      {error && (
        <span className="text-[12px] leading-[15px] text-red-500">
          {error}
        </span>
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
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedServices = selection
    ? services.filter((service) => selection.serviceIds.includes(service.id))
    : [];

  const selectedStylist =
    selection?.stylistId == null
      ? null
      : stylists.find((stylist) => stylist.id === selection.stylistId) ?? null;

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );

  const nameError = touched.name ? validateName(name) : null;
  const emailError = touched.email ? validateEmail(email) : null;
  const phoneError = touched.phone ? validatePhone(phone) : null;

  const canBook =
    selection !== null &&
    !submitting &&
    validateName(name) === null &&
    validateEmail(email) === null &&
    validatePhone(phone) === null;

  async function handleSubmit() {
    setTouched({
      name: true,
      email: true,
      phone: true,
    });

    setSubmitError(null);

    if (!selection || !canBook) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...selection,
          name: name.trim(),
          email: email.trim(),
          phone,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const firstError =
          body?.errors && typeof body.errors === "object"
            ? Object.values(body.errors).flat()[0]
            : null;

        setSubmitError(
          typeof firstError === "string"
            ? firstError
            : body?.error ?? "Could not submit booking. Please try again."
        );

        return;
      }

      onBook(body.booking);
    } catch (error) {
      console.error("Failed to submit booking:", error);
      setSubmitError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full">
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
        label="Name"
        placeholder="Full name"
        value={name}
        onChange={setName}
        onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
        error={nameError}
      />

      <FormField
        label="Email"
        type="email"
        placeholder="name@email.com"
        value={email}
        onChange={setEmail}
        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
        error={emailError}
      />

      <FormField
        label="Phone"
        type="tel"
        placeholder="(000) 000-0000"
        value={phone}
        onChange={(raw) => setPhone(formatPhone(raw))}
        onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
        error={phoneError}
      />

      {submitError && (
        <p className="text-[12px] leading-[15px] text-red-500 w-full">
          {submitError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
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
    </div>
  );
}