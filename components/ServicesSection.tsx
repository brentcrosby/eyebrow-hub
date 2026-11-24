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

export function isServiceCatalog(data: unknown): data is Service[] {
  return (
    Array.isArray(data) &&
    data.every(
      (service) =>
        service !== null &&
        typeof service === "object" &&
        Number.isInteger(service.id) &&
        service.id > 0 &&
        typeof service.name === "string" &&
        service.name.trim().length > 0 &&
        typeof service.price === "number" &&
        Number.isFinite(service.price) &&
        service.price >= 0 &&
        Number.isInteger(service.durationMinutes) &&
        service.durationMinutes > 0
    )
  );
}

type CatalogState =
  | { status: "loading" | "error" }
  | { status: "ready"; services: Service[] };

export default function ServicesSection() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadServices() {
      try {
        const response = await fetch("/api/services", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Catalog request failed");
        const data: unknown = await response.json();
        if (!isServiceCatalog(data))
          throw new Error("Invalid catalog response");
        if (!controller.signal.aborted)
          setCatalog({ status: "ready", services: data });
      } catch {
        if (!controller.signal.aborted) setCatalog({ status: "error" });
      }
    }
    void loadServices();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section id="services" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">Services</h2>

      <p className="mt-3 max-w-[280px] text-[12px] leading-5 text-[#8e8a86]">
        Select from available services or book a Brow Consult and we will guide
        you.
      </p>

      <div
        className="mt-5"
        aria-live="polite"
        aria-busy={catalog.status === "loading"}
      >
        {catalog.status === "loading" && (
          <p className="text-sm">Loading services…</p>
        )}
        {catalog.status === "error" && (
          <div className="text-sm">
            <p>We couldn’t load our services. Please try again.</p>
            <button
              type="button"
              className="mt-3 rounded border border-[#5e3d1e] px-4 py-2 text-[#5e3d1e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5e3d1e]"
              onClick={() => {
                setCatalog({ status: "loading" });
                setAttempt((current) => current + 1);
              }}
            >
              Retry services
            </button>
          </div>
        )}
        {catalog.status === "ready" && catalog.services.length === 0 && (
          <p className="text-sm">
            No services are currently available online. Please contact the salon
            for help.
          </p>
        )}
        <div className="space-y-3">
          {catalog.status === "ready" &&
            catalog.services.map((service) => (
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
