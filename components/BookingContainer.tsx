"use client";

import { useState } from "react";
import { MultiSelectDropdown, SingleSelectDropdown, DatePickerDropdown, TimePickerDropdown, TimeSlot } from "./Dropdown";
import BookingForm from "./BookingForm";

const SERVICES = [
  "Brow Consult",
  "Eyebrow",
  "Chin/Lip",
  "Cheeks",
  "Forehead",
  "Full Face",
  "Half Face",
  "Lip",
  "Unibrow",
  "Men's Eyebrow/Cheeks",
  "Sideburns",
  "Eyebrows/Forehead",
  "Eyebrows/Lip/Chin",
];

const TIME_SLOTS: TimeSlot[] = [
  { time: "10:00 AM", available: false },
  { time: "10:30 AM", available: false },
  { time: "11:00 AM", available: true },
  { time: "11:30 AM", available: true },
  { time: "12:00 PM", available: true },
  { time: "12:30 PM", available: true },
  { time: "1:00 PM",  available: true },
  { time: "1:30 PM",  available: true },
  { time: "2:00 PM",  available: false },
  { time: "2:30 PM",  available: true },
  { time: "3:00 PM",  available: true },
  { time: "3:30 PM",  available: true },
  { time: "4:00 PM",  available: true },
  { time: "4:30 PM",  available: true },
  { time: "5:00 PM",  available: false },
];

const STYLISTS = [
  "Next Available",
  "Ava Nguyen",
  "Maya Patel",
  "Sofia Ramirez",
  "Jasmine Lee",
];

type Step = "dropdowns" | "form" | "confirmation";

export default function BookingContainer() {
  const [step, setStep] = useState<Step>("dropdowns");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStylist, setSelectedStylist] = useState("Next Available");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");

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
            options={SERVICES}
            selected={selectedServices}
            onChange={setSelectedServices}
          />

          <SingleSelectDropdown
            label="Stylist"
            options={STYLISTS}
            value={selectedStylist}
            onChange={setSelectedStylist}
          />

          <DatePickerDropdown
            label="Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />

          <TimePickerDropdown
            label="Time"
            value={selectedTime}
            onChange={setSelectedTime}
            slots={TIME_SLOTS}
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
