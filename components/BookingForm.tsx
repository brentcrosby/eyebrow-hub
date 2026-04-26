"use client";

import { useState } from "react";
import type { BookingSelection } from "@/lib/validations/booking";

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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : "Enter a valid email address";
}

function validatePhone(phone: string): string | null {
  return phone.replace(/\D/g, "").length === 10 ? null : "Enter a 10-digit phone number";
}

interface FormFieldProps {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | null;
}

function FormField({ label, type = "text", placeholder, value, onChange, onBlur, error }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[14px] leading-[17px] font-medium text-black">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="px-4 py-4 w-full rounded-lg bg-white text-[14px] leading-[17px] text-black placeholder:text-black/50 outline-none focus:ring-1 focus:ring-black/20"
        style={{ border: `1px solid ${error ? "rgba(220,38,38,0.4)" : "rgba(0,0,0,0.1)"}` }}
      />
      {error && (
        <span className="text-[12px] leading-[15px] text-red-500">{error}</span>
      )}
    </div>
  );
}

interface BookingFormProps {
  selection: BookingSelection | null;
  onBook: () => void;
  onBack: () => void;
}

export default function BookingForm({ selection, onBook, onBack }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const nameError = touched.name ? validateName(name) : null;
  const emailError = touched.email ? validateEmail(email) : null;
  const phoneError = touched.phone ? validatePhone(phone) : null;

  const canBook =
    validateName(name) === null &&
    validateEmail(email) === null &&
    validatePhone(phone) === null;

  return (
    <div className="flex flex-col gap-5 w-full">
      <FormField
        label="Name"
        placeholder="Full name"
        value={name}
        onChange={setName}
        onBlur={() => touch("name")}
        error={nameError}
      />

      <FormField
        label="Email"
        type="email"
        placeholder="name@email.com"
        value={email}
        onChange={setEmail}
        onBlur={() => touch("email")}
        error={emailError}
      />

      <FormField
        label="Phone"
        type="tel"
        placeholder="(000) 000-0000"
        value={phone}
        onChange={(raw) => setPhone(formatPhone(raw))}
        onBlur={() => touch("phone")}
        error={phoneError}
      />

      <button
        onClick={onBook}
        disabled={!canBook}
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white"
        style={{
          backgroundColor: "#6B4F3A",
          opacity: canBook ? 1 : 0.25,
          cursor: canBook ? "pointer" : "not-allowed",
        }}
      >
        Book Appointment
      </button>

      <button
        onClick={onBack}
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-black cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
      >
        Back
      </button>
    </div>
  );
}
