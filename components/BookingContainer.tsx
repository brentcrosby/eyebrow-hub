"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MultiSelectDropdown,
  SingleSelectDropdown,
  DatePickerDropdown,
  TimePickerDropdown,
  TimeSlot,
} from "./Dropdown";
import BookingForm, { type BookingContact, type BookingTouched } from "./BookingForm";
import {
  BOOKING_LIMITS,
  bookingSelectionSchema,
  type BookingSelection,
} from "@/lib/validations/booking";
import { toDateParam } from "@/lib/dateUtils";

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

export type BookingConfirmation = {
  id: number;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  services: Service[];
  stylistName: string | null;
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
};

const NEXT_AVAILABLE = "Next Available";

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let part = "";
  let octets = 0;

  // Count UTF-8 bytes, not JavaScript code units; never split a code point.
  for (const character of line) {
    const width = encoder.encode(character).length;
    if (octets + width > 75) {
      parts.push(part);
      part = " "; // The continuation space counts toward the next 75 octets.
      octets = 1;
    }
    part += character;
    octets += width;
  }
  parts.push(part);
  return parts.join("\r\n");
}

function downloadCalendarFile(booking: BookingConfirmation) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  const formatCalendarDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const serviceNames = booking.services
    .map((service) => service.name)
    .join(", ");

  const calendarContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eyebrow Hub//Booking//EN",
    "BEGIN:VEVENT",
    `UID:eyebrow-hub-booking-${booking.id}`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
    "SUMMARY:Eyebrow Hub Appointment",
    `DESCRIPTION:${escapeCalendarText(
      `Services: ${serviceNames}\nStylist: ${booking.stylistName ?? NEXT_AVAILABLE}\nCustomer: ${booking.customerName}`
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(foldCalendarLine).join("\r\n") + "\r\n";

  const blob = new Blob([calendarContent], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "eyebrow-hub-appointment.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Step = "dropdowns" | "form" | "confirmation";

export default function BookingContainer() {
  const [step, setStep] = useState<Step>("dropdowns");
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(
    new Set()
  );
  const [datesStatus, setDatesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [datesRefresh, setDatesRefresh] = useState(0);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedStylist, setSelectedStylist] = useState(NEXT_AVAILABLE);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [contact, setContact] = useState<BookingContact>({ name: "", email: "", phone: "", notes: "" });
  const [touched, setTouched] = useState<BookingTouched>({ name: false, email: false, phone: false, notes: false });
  const [availability, setAvailability] = useState<{ key: string; status: "loading" | "ready" | "error" }>({ key: "", status: "loading" });
  const [refresh, setRefresh] = useState(0);
  const availabilityRequest = useRef(0);
  const selectionRef = useRef("");
  const [bookingSelection, setBookingSelection] =
    useState<BookingSelection | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    null
  );
  const [continueError, setContinueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const validating = useRef(false);

  function invalidateSelection() {
    selectionRef.current = "";
  }

  function resetBookingFlow() {
    invalidateSelection();
    setSelectedServices([]);
    setSelectedStylist(NEXT_AVAILABLE);
    setSelectedDate(null);
    setSelectedTime("");
    setTimeSlots([]);
    setBookingSelection(null);
    setContact({ name: "", email: "", phone: "", notes: "" });
    setTouched({ name: false, email: false, phone: false, notes: false });
    setConfirmation(null);
    setContinueError(null);
    setSubmitting(false);
    setStep("dropdowns");
  }

  const totalDuration = services
    .filter((service) => selectedServices.includes(service.id))
    .reduce((sum, service) => sum + service.durationMinutes, 0);
  const dateKey = selectedDate ? toDateParam(selectedDate) : "";
  const availabilityKey = `${dateKey}:${totalDuration}:${selectedServices.join(",")}:${selectedStylist}:${refresh}`;
  const selectionKey = JSON.stringify({ serviceIds: selectedServices, stylist: selectedStylist, date: dateKey, time: selectedTime, availabilityKey });
  selectionRef.current = selectionKey;

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => setServices(data))
      .catch((err) => console.error("Failed to load services:", err));

    fetch("/api/stylists")
      .then((res) => res.json())
      .then((data: Stylist[]) => setStylists(data))
      .catch((err) => console.error("Failed to load stylists:", err));

  }, []);

  useEffect(() => {
    let active = true;
    setDatesStatus("loading");
    fetch("/api/availability/dates")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load available dates");
        return res.json();
      })
      .then(
        (
          data: {
            date: string;
            unavailable?: boolean;
            available?: boolean;
          }[]
        ) => {
          if (!active) return;
          if (!Array.isArray(data) || !data.every((item) => item && typeof item.date === "string" && (typeof item.available === "boolean" || typeof item.unavailable === "boolean"))) throw new Error("Invalid available dates");
          setUnavailableDates(
            new Set(
              data
                .filter(
                  (dateInfo) =>
                    dateInfo.unavailable === true ||
                    dateInfo.available === false
                )
                .map((dateInfo) => dateInfo.date)
            )
          );
          setDatesStatus("ready");
        }
      )
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load available dates:", err);
        setDatesStatus("error");
      });
    return () => { active = false; };
  }, [datesRefresh]);

  useEffect(() => {
    const request = ++availabilityRequest.current;
    const controller = new AbortController();
    setAvailability({ key: availabilityKey, status: "loading" });
    setTimeSlots([]);
    if (!selectedDate) return () => controller.abort();

    const params = new URLSearchParams({
      date: toDateParam(selectedDate),
    });

    if (totalDuration > 0) {
      params.set("duration", String(totalDuration));
    }

    fetch(`/api/availability/times?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load time slots");
        const data: unknown = await res.json();
        if (!Array.isArray(data) || !data.every((slot) =>
          slot && typeof slot.time === "string" && typeof slot.available === "boolean"
        )) throw new Error("Invalid time slots");
        if (request !== availabilityRequest.current || controller.signal.aborted) return;
        setTimeSlots(data as TimeSlot[]);
        setAvailability({ key: availabilityKey, status: "ready" });
      })
      .catch((err) => {
        if (request !== availabilityRequest.current || controller.signal.aborted) return;
        console.error("Failed to load time slots:", err);
        setTimeSlots([]);
        setAvailability({ key: availabilityKey, status: "error" });
      });
    return () => controller.abort();
  }, [selectedDate, totalDuration, availabilityKey]);

  useEffect(() => {
    if (!selectedTime) return;

    const stillAvailable = timeSlots.some(
      (slot) => slot.time === selectedTime && slot.available
    );

    if (availability.key === availabilityKey && availability.status === "ready" && !stillAvailable) {
      invalidateSelection();
      setSelectedTime("");
    }
  }, [timeSlots, selectedTime, availability, availabilityKey]);

  useEffect(() => {
    if (services.length === 0) return;

    const validIds = new Set(services.map((service) => service.id));

    setSelectedServices((prev) =>
      prev.filter((serviceId) => validIds.has(serviceId))
    );
  }, [services]);

  useEffect(() => {
    if (selectedStylist === NEXT_AVAILABLE) return;
    if (stylists.length === 0) return;

    const valid = stylists.some((stylist) => stylist.name === selectedStylist);

    if (!valid) {
      setSelectedStylist(NEXT_AVAILABLE);
    }
  }, [stylists, selectedStylist]);

  useEffect(() => {
    if (!selectedDate) return;

    if (unavailableDates.has(toDateParam(selectedDate))) {
      invalidateSelection();
      setSelectedDate(null);
    }
  }, [unavailableDates, selectedDate]);

  const stylistOptions = [
    NEXT_AVAILABLE,
    ...stylists.map((stylist) => stylist.name),
  ];
  const serviceNameCounts = new Map<string, number>();
  const serviceDescriptions = new Map<string, number>();
  for (const service of services) {
    serviceNameCounts.set(
      service.name,
      (serviceNameCounts.get(service.name) ?? 0) + 1
    );
  }
  const serviceOptions = services.map((service) => {
    if ((serviceNameCounts.get(service.name) ?? 0) === 1) {
      return { id: service.id, label: service.name };
    }
    const description = `${service.name} — ${service.durationMinutes} min · $${service.price.toFixed(2)}`;
    const occurrence = (serviceDescriptions.get(description) ?? 0) + 1;
    serviceDescriptions.set(description, occurrence);
    const matchingDescriptions = services.filter(
      (other) =>
        other.name === service.name &&
        other.durationMinutes === service.durationMinutes &&
        other.price === service.price
    ).length;
    return {
      id: service.id,
      label:
        matchingDescriptions > 1
          ? `${description} (option ${occurrence})`
          : description,
    };
  });

  const canContinue =
    datesStatus === "ready" &&
    selectedServices.length > 0 &&
    selectedServices.length <= BOOKING_LIMITS.services &&
    selectedDate !== null &&
    selectedTime !== "" &&
    availability.key === availabilityKey &&
    availability.status === "ready" &&
    timeSlots.some((slot) => slot.time === selectedTime && slot.available) &&
    !submitting;

  const selectedStylistId =
    selectedStylist === NEXT_AVAILABLE
      ? null
      : (stylists.find((stylist) => stylist.name === selectedStylist)?.id ?? null);
  const selectionReady =
    canContinue &&
    bookingSelection?.time === selectedTime &&
    bookingSelection?.date === dateKey &&
    JSON.stringify(bookingSelection?.serviceIds) === JSON.stringify(selectedServices) &&
    bookingSelection?.stylistId === selectedStylistId;

  async function handleContinue() {
    if (!selectedDate || !canContinue || validating.current) return;
    validating.current = true;
    const validatedSelection = selectionKey;

    const payload: BookingSelection = {
      serviceIds: selectedServices,
      stylistId: selectedStylistId,
      date: toDateParam(selectedDate),
      time: selectedTime,
    };

    const parsed = bookingSelectionSchema.safeParse(payload);
    if (!parsed.success) {
      setContinueError(
        parsed.error.issues[0]?.message ?? "Please review your selection."
      );
      return;
    }

    setSubmitting(true);
    setContinueError(null);

    try {
      const res = await fetch("/api/bookings/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (selectionRef.current !== validatedSelection) return;

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (selectionRef.current !== validatedSelection) return;

        const firstError =
          body?.errors && typeof body.errors === "object"
            ? Object.values(body.errors).flat()[0]
            : null;

        setContinueError(
          typeof firstError === "string"
            ? firstError
            : "Your selection is no longer available. Please review and try again."
        );

        return;
      }

      if (selectionRef.current !== validatedSelection) return;
      setBookingSelection(payload);
      setStep("form");
    } catch (err) {
      if (selectionRef.current !== validatedSelection) return;
      console.error("Failed to validate booking:", err);
      setContinueError("Could not reach the server. Please try again.");
    } finally {
      validating.current = false;
      setSubmitting(false);
    }
  }

  if (step === "confirmation" && confirmation) {
    return (
      <div
        className="flex flex-col items-start gap-5 pt-6 px-8 pb-8 bg-white rounded-[15px] w-full"
        style={{ border: "1px solid rgba(0,0,0,0.05)" }}
      >
        <div className="flex flex-col gap-4 w-full">
          <h2 className="text-[20px] leading-6 font-normal text-black">
            Thank You
          </h2>

          <p className="text-[14px] leading-[22px] text-black/50">
            Your appointment has been requested and is pending approval. Please
            save your confirmation number and booking phone number to look up or
            cancel your request in{" "}
            <Link href="/manage-booking" className="underline text-black">
              Manage Booking
            </Link>
            .
          </p>

          <div
            className="flex flex-col gap-3 p-4 rounded-lg bg-[#F8F5F2]"
            style={{ border: "1px solid rgba(0,0,0,0.05)" }}
          >
            <h3 className="text-[15px] font-medium text-black">
              Booking Summary
            </h3>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">
                Confirmation number:
              </span>{" "}
              {confirmation.bookingReference}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Name:</span>{" "}
              {confirmation.customerName}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Email:</span>{" "}
              {confirmation.customerEmail}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Phone:</span>{" "}
              {confirmation.customerPhone}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Services:</span>{" "}
              {confirmation.services.map((service) => service.name).join(", ")}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Stylist:</span>{" "}
              {confirmation.stylistName ?? NEXT_AVAILABLE}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Date:</span>{" "}
              {confirmation.date}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Time:</span>{" "}
              {confirmation.time}
            </p>

            <p className="text-[14px] text-black/70">
              <span className="font-medium text-black">Total:</span>{" "}
              {confirmation.totalPrice === 0
                ? "Free"
                : `$${confirmation.totalPrice.toFixed(2)}`}
            </p>
          </div>

          <p className="text-[14px] leading-[22px] text-black/50">
            Cancellation Policy: Online cancellation is available only while all
            services are pending or confirmed and the first service starts more
            than 4 hours from now.
          </p>
        </div>

        <button
          type="button"
          onClick={() => downloadCalendarFile(confirmation)}
          className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white cursor-pointer"
          style={{ backgroundColor: "#6B4F3A" }}
        >
          Add to Calendar
        </button>

        <button
          type="button"
          onClick={resetBookingFlow}
          className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-black cursor-pointer"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          Start Another Booking
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-start gap-5 pt-6 px-8 pb-8 bg-white rounded-[15px] w-full"
      style={{ border: "1px solid rgba(0,0,0,0.05)" }}
    >
      <div className="flex flex-col gap-4 w-full">
        <h2 className="text-[20px] leading-6 font-normal text-black">
          Book Online
        </h2>

        <p className="text-[14px] leading-[17px] text-black/50">
          {step === "dropdowns"
            ? "Select a service, stylist, and preferred time."
            : "Add your contact information to reserve your appointment."}
        </p>
      </div>

      {step === "dropdowns" ? (
        <>
          <MultiSelectDropdown
            label="Service"
            placeholder="Select Service(s)"
            options={serviceOptions}
            selected={selectedServices}
            onChange={(ids) => {
              invalidateSelection();
              setSelectedServices(ids);
              setContinueError(null);
            }}
            maxSelected={BOOKING_LIMITS.services}
          />
          <p className="text-[12px] text-black/60">
            {selectedServices.length >= BOOKING_LIMITS.services
              ? `Maximum ${BOOKING_LIMITS.services} services selected. Remove one to choose another.`
              : `Select up to ${BOOKING_LIMITS.services} services.`}
          </p>

          <SingleSelectDropdown
            label="Stylist"
            options={stylistOptions}
            value={selectedStylist}
            onChange={(stylist) => { invalidateSelection(); setSelectedStylist(stylist); }}
          />

          <DatePickerDropdown
            label="Date"
            value={selectedDate}
            onChange={(date) => { invalidateSelection(); setSelectedDate(date); setSelectedTime(""); }}
            unavailableDates={unavailableDates}
          />

          {datesStatus === "error" && (
            <button type="button" onClick={() => setDatesRefresh((current) => current + 1)} className="text-[14px] underline text-black">Could not load dates. Retry loading dates</button>
          )}

          <TimePickerDropdown
            label="Time"
            value={selectedTime}
            onChange={(time) => { invalidateSelection(); setSelectedTime(time); }}
            slots={availability.key === availabilityKey && availability.status === "ready" ? timeSlots : []}
            emptyMessage={
              !selectedDate ? "Select a date first" : availability.key !== availabilityKey || availability.status === "loading" ? "Loading times…" : availability.status === "error" ? "Could not load times. Please retry." : "No times available"
            }
          />

          {selectedDate && availability.key === availabilityKey && availability.status === "error" && (
            <button type="button" onClick={() => setRefresh((current) => current + 1)} className="text-[14px] underline text-black">Retry loading times</button>
          )}

          {continueError && (
            <p className="text-[12px] leading-[15px] text-red-500 w-full">
              {continueError}
            </p>
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white"
            style={{
              backgroundColor: "#6B4F3A",
              opacity: canContinue ? 1 : 0.25,
              cursor: canContinue ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Checking…" : "Continue"}
          </button>
        </>
      ) : (
        <BookingForm
          selection={bookingSelection}
          selectionReady={selectionReady}
          services={services}
          stylists={stylists}
          onBook={(booking) => {
            setConfirmation(booking);
            setStep("confirmation");
          }}
          onBack={() => setStep("dropdowns")}
          contact={contact}
          onContactChange={setContact}
          touched={touched}
          onTouchedChange={setTouched}
          onTimeConflict={(message) => {
            invalidateSelection();
            setSelectedTime("");
            setBookingSelection(null);
            setContinueError(message);
            setRefresh((current) => current + 1);
            setStep("dropdowns");
          }}
        />
      )}
    </div>
  );
}
