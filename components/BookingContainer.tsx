"use client";

import { useEffect, useState } from "react";
import { MultiSelectDropdown, SingleSelectDropdown, DatePickerDropdown, TimePickerDropdown, TimeSlot } from "./Dropdown";
import BookingForm from "./BookingForm";

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

const NEXT_AVAILABLE = "Next Available";

function formatDateParam(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Step = "dropdowns" | "form" | "confirmation";

export default function BookingContainer() {
  const [step, setStep] = useState<Step>("dropdowns");
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState(NEXT_AVAILABLE);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");

  const totalDuration = services
    .filter((s) => selectedServices.includes(s.name))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

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
      .then((data: { date: string; available: boolean }[]) => {
        setUnavailableDates(new Set(data.filter((d) => !d.available).map((d) => d.date)));
      })
      .catch((err) => console.error("Failed to load available dates:", err));
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const params = new URLSearchParams({ date: formatDateParam(selectedDate) });
    if (totalDuration > 0) params.set("duration", String(totalDuration));

    fetch(`/api/availability/times?${params.toString()}`)
      .then((res) => res.json())
      .then((data: TimeSlot[]) => setTimeSlots(data))
      .catch((err) => console.error("Failed to load time slots:", err));
  }, [selectedDate, totalDuration]);

  useEffect(() => {
    if (!selectedTime) return;
    const stillAvailable = timeSlots.some(
      (s) => s.time === selectedTime && s.available
    );
    if (!stillAvailable) setSelectedTime("");
  }, [timeSlots, selectedTime]);

  const stylistOptions = [NEXT_AVAILABLE, ...stylists.map((s) => s.name)];

  // Stylist is always valid (any selection including "Next Available" counts)
  const canContinue =
    selectedServices.length > 0 &&
    selectedDate !== null &&
    selectedTime !== "";

  if (step === "confirmation") {
    return (
      <div
        className="flex flex-col items-start gap-5 pt-6 px-8 pb-8 bg-white rounded-[15px] w-full"
        style={{ border: "1px solid rgba(0,0,0,0.05)" }}
      >
        <div className="flex flex-col gap-4 w-full">
          <h2 className="text-[20px] leading-6 font-normal text-black">Thank You</h2>
          <p className="text-[14px] leading-[22px] text-black/50">
            Your appointment was successfully requested. You will receive email
            confirmation soon. Please let us know if plans change and you need
            to reschedule.
          </p>
          <p className="text-[14px] leading-[22px] text-black/50">
            Cancellation Policy: Please cancel or reschedule at least 4 hours
            before your appointment time.
          </p>
        </div>

        <button
          className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white cursor-pointer"
          style={{ backgroundColor: "#6B4F3A" }}
        >
          Add to Calendar
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-start gap-5 pt-6 px-8 pb-8 bg-white rounded-[15px] w-full"
      style={{ border: "1px solid rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 w-full">
        <h2 className="text-[20px] leading-6 font-normal text-black">Book Online</h2>
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
            options={services.map((s) => s.name)}
            selected={selectedServices}
            onChange={setSelectedServices}
          />

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
          />

          <button
            onClick={() => setStep("form")}
            disabled={!canContinue}
            className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white"
            style={{
              backgroundColor: "#6B4F3A",
              opacity: canContinue ? 1 : 0.25,
              cursor: canContinue ? "pointer" : "not-allowed",
            }}
          >
            Continue
          </button>
        </>
      ) : (
        <BookingForm
          onBook={() => setStep("confirmation")}
          onBack={() => setStep("dropdowns")}
        />
      )}
    </div>
  );
}
