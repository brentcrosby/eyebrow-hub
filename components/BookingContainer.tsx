"use client";

import { useState, useRef, useEffect } from "react";

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

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BookingContainer() {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  const serviceLabel = selectedServices.length > 0 ? selectedServices.join(", ") : null;

  return (
    <div
      className="flex flex-col items-start gap-8 p-8 bg-white rounded-[15px] w-full"
      style={{ border: "1px solid rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 w-full">
        <h2 className="text-[20px] leading-6 font-normal text-black">Book Online</h2>
        <p className="text-[14px] leading-[17px] text-black/50">
          Select a service, stylist, and preferred time.
        </p>
      </div>

      {/* Service */}
      <div className="flex flex-col gap-2 w-full relative" ref={serviceRef}>
        <label className="text-[14px] leading-[17px] font-medium text-black">Service</label>
        <button
          type="button"
          onClick={() => setServiceOpen((o) => !o)}
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white cursor-pointer"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className={`text-[14px] leading-[17px] text-left truncate pr-2 ${serviceLabel ? "text-black" : "text-black/50"}`}>
            {serviceLabel ?? "Select Service(s)"}
          </span>
          <ChevronIcon open={serviceOpen} />
        </button>

        {serviceOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-1 flex flex-col bg-white rounded-lg z-10"
            style={{
              padding: "16px 0",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {SERVICES.map((service) => {
              const checked = selectedServices.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className="flex flex-row items-center gap-3 px-4 py-3 w-full text-left"
                >
                  <div
                    className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{
                      border: checked ? "none" : "1.5px solid rgba(0,0,0,0.2)",
                      backgroundColor: checked ? "#6B4F3A" : "white",
                    }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-[14px] leading-[17px] text-black">{service}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stylist */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Stylist</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black">Next Available</span>
          <ChevronIcon />
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Date</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black">02/25/2026</span>
          <ChevronIcon />
        </div>
      </div>

      {/* Time */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[14px] leading-[17px] font-medium text-black">Time</label>
        <div
          className="flex flex-row justify-between items-center px-4 py-4 w-full rounded-lg bg-white"
          style={{ border: "1px solid rgba(0,0,0,0.1)" }}
        >
          <span className="text-[14px] leading-[17px] text-black/50">Choose a time</span>
          <ChevronIcon />
        </div>
      </div>

      {/* Continue Button */}
      <button
        disabled
        className="flex justify-center items-center w-full h-12 rounded-[48px] text-[14px] leading-[17px] font-medium text-white cursor-not-allowed"
        style={{ backgroundColor: "#6B4F3A", opacity: 0.25 }}
      >
        Continue
      </button>
    </div>
  );
}
