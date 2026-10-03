"use client";

import { useEffect, useState } from "react";
import {
  MultiSelectDropdown,
  SingleSelectDropdown,
  DatePickerDropdown,
  TimePickerDropdown,
  TimeSlot,
} from "./Dropdown";
import BookingForm from "./BookingForm";
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
    `DESCRIPTION:Services: ${serviceNames}\\nStylist: ${
      booking.stylistName ?? NEXT_AVAILABLE
    }\\nCustomer: ${booking.customerName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedStylist, setSelectedStylist] = useState(NEXT_AVAILABLE);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingSelection, setBookingSelection] =
    useState<BookingSelection | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    null
  );
  const [continueError, setContinueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetBookingFlow() {
    setSelectedServices([]);
    setSelectedStylist(NEXT_AVAILABLE);
    setSelectedDate(null);
    setSelectedTime("");
    setTimeSlots([]);
    setBookingSelection(null);
    setConfirmation(null);
    setContinueError(null);
    setSubmitting(false);
    setStep("dropdowns");
  }

  const totalDuration = services
    .filter((service) => selectedServices.includes(service.id))
    .reduce((sum, service) => sum + service.durationMinutes, 0);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => setServices(data))
      .catch((err) => console.error("Failed to load services:", err));

    fetch("/api/stylists")
      .then((res) => res.json())
      .then((data: Stylist[]) => setStylists(data))
      .catch((err) => console.error("Failed to load stylists:", err));

    fetch("/api/availability/dates")
      .then((res) => res.json())
      .then(
        (
          data: {
            date: string;
            unavailable?: boolean;
            available?: boolean;
          }[]
        ) => {
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
        }
      )
      .catch((err) => console.error("Failed to load available dates:", err));
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const params = new URLSearchParams({
      date: toDateParam(selectedDate),
    });

    if (totalDuration > 0) {
      params.set("duration", String(totalDuration));
    }

    fetch(`/api/availability/times?${params.toString()}`)
      .then((res) => res.json())
      .then((data: TimeSlot[]) => setTimeSlots(data))
      .catch((err) => console.error("Failed to load time slots:", err));
  }, [selectedDate, totalDuration]);

  useEffect(() => {
    if (!selectedTime) return;

    const stillAvailable = timeSlots.some(
      (slot) => slot.time === selectedTime && slot.available
    );

    if (!stillAvailable) {
      setSelectedTime("");
    }
  }, [timeSlots, selectedTime]);

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
    selectedServices.length > 0 &&
    selectedServices.length <= BOOKING_LIMITS.services &&
    selectedDate !== null &&
    selectedTime !== "" &&
    !submitting;

  async function handleContinue() {
    if (!selectedDate) return;

    const stylistId =
      selectedStylist === NEXT_AVAILABLE
        ? null
        : (stylists.find((stylist) => stylist.name === selectedStylist)?.id ??
          null);

    const payload: BookingSelection = {
      serviceIds: selectedServices,
      stylistId,
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

      if (!res.ok) {
        const body = await res.json().catch(() => null);

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

      setBookingSelection(payload);
      setStep("form");
    } catch (err) {
      console.error("Failed to validate booking:", err);
      setContinueError("Could not reach the server. Please try again.");
    } finally {
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
            Your appointment was successfully requested. You will receive email
            confirmation soon.
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
            Cancellation Policy: Please cancel or reschedule at least 4 hours
            before your appointment time.
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
            onChange={setSelectedStylist}
          />

          <DatePickerDropdown
            label="Date"
            value={selectedDate}
            onChange={setSelectedDate}
            unavailableDates={unavailableDates}
          />

          <TimePickerDropdown
            label="Time"
            value={selectedTime}
            onChange={setSelectedTime}
            slots={timeSlots}
            emptyMessage={
              selectedDate ? "No times available" : "Select a date first"
            }
          />

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
          services={services}
          stylists={stylists}
          onBook={(booking) => {
            setConfirmation(booking);
            setStep("confirmation");
          }}
          onBack={() => setStep("dropdowns")}
        />
      )}
    </div>
  );
}
