"use client";

import { useState } from "react";
import ServiceCard from "./ServiceCard";

const services = [
  "Brow Consult",
  "Eyebrow",
  "Chin/Lip",
  "Cheeks",
  "Forehead",
  "Full Face",
  "Half Face",
  "Lip",
  "Unibrow",
  "Men’s Eyebrow/Cheeks",
  "Sideburns",
  "Eyebrows/Forehead",
  "Eyebrows/Lip/Chin"
];

export default function ServiceList() {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelect = (service: string) => {
    setSelected(service);
    setError("");
  };

  const handleContinue = () => {
    if (!selected) {
      setError("Please select a service.");
      return;
    }

    console.log("Selected:", selected);
  };

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-3">Select a Service</h2>

      <div className="grid grid-cols-2 gap-3">
        {services.map((service) => (
          <ServiceCard
            key={service}
            name={service}
            selected={selected === service}
            onClick={() => handleSelect(service)}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm mt-3">{error}</p>
      )}

      <button
        onClick={handleContinue}
        className="mt-5 w-full py-2 bg-black text-white rounded-lg"
      >
        Continue
      </button>
    </div>
  );
}