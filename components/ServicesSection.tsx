"use client";

import { useEffect, useState } from "react";

type Service = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number;
};

function formatPrice(price: number): string {
  return price === 0 ? "Free" : `$${price}`;
}

export default function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => setServices(data))
      .catch((err) => console.error("Failed to load services:", err));
  }, []);

  return (
    <section id="services" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">Services</h2>

      <p className="mt-3 max-w-[280px] text-[12px] leading-5 text-[#8e8a86]">
        Select from available services or book a Brow Consult and we will guide
        you.
      </p>

      <div className="mt-5">
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between border-b border-[#e8e3de] pb-2 text-[13px] text-[#1f1f1f]"
            >
              <span>{service.name}</span>
              <span>{formatPrice(service.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
