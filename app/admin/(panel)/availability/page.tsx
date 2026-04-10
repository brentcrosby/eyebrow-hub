"use client";

import Image from "next/image";
import brownLogo from "@/app/assests/logos/brown logo.png";

const sidebarItems = [
  "Dashboard",
  "Schedule",
  "Services",
  "Availability",
  "Settings",
  "Log Out",
];

const sectionCards = [
  {
    title: "Weekly Business Hours",
    description: "Manage the weekly business hours for each day of the week.",
  },
  {
    title: "Block Times",
    description: "View and manage blocked dates and times for the calendar.",
  },
  {
    title: "Scheduling Rules",
    description: "Control notice periods, buffers, and booking rule settings.",
  },
];

export default function AdminAvailabilityPage() {
  return (
    <main className="min-h-screen bg-[#f5f1eb] p-4 sm:p-6">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-[28px] bg-white shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)]">
        <aside className="hidden w-64 border-r border-[#eadfce] bg-[#fbf6ef] px-8 py-10 md:flex md:flex-col">
          <div className="flex flex-col items-center text-center">
            <Image
              src={brownLogo}
              alt="Eyebrow Hub logo"
              width={180}
              height={64}
              className="h-auto w-full max-w-[180px]"
              priority
            />
            <p className="mt-6 text-[15px] text-[#b09175]">Admin Panel</p>
          </div>

          <nav className="mt-12" aria-label="Admin sidebar">
            <ul className="space-y-3">
              {sidebarItems.map((item) => {
                const isActive = item === "Availability";

                return (
                  <li key={item}>
                    <span
                      className={`block rounded-full px-4 py-3 text-sm ${
                        isActive
                          ? "bg-[#7a5a3c] text-white"
                          : "text-[#7a5a3c]"
                      }`}
                    >
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#b79d84]">
                Admin Availability
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#7a5a3c]">
                Availability
              </h1>
            </div>

            <p className="text-sm text-[#7a5a3c]">Welcome, Owner</p>
          </div>

          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
              <div className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                {sectionCards[0].title}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[#dccab5] bg-white p-6 text-sm text-[#8b735d]">
                {sectionCards[0].description}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {sectionCards.slice(1).map((card) => (
                <section
                  key={card.title}
                  className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6"
                >
                  <div className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                    {card.title}
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-[#dccab5] bg-white p-6 text-sm text-[#8b735d]">
                    {card.description}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
