"use client";

import Link from "next/link";

export function Footer() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="w-full bg-[#6B4F3A] py-20 px-10">
      <div className="max-w-[800px] mx-auto flex flex-row justify-between items-start">
        {/* Brand + Staff Login */}
        <div className="flex flex-col justify-between gap-2 h-[116px]">
          <span className="text-white font-medium text-sm">Eyebrow Hub</span>
          <Link
            href="/admin/login"
            className="text-white text-sm font-normal mt-auto"
          >
            Staff Login
          </Link>
        </div>

        {/* Learn More links */}
        <div className="flex flex-col gap-4">
          <span className="text-white/50 text-sm">Learn More</span>
          <button
            onClick={() => scrollTo("services")}
            className="text-white text-sm text-left"
          >
            Services
          </button>
          <button
            onClick={() => scrollTo("about")}
            className="text-white text-sm text-left"
          >
            About
          </button>
          <button
            onClick={() => scrollTo("booking")}
            className="text-white text-sm text-left"
          >
            Contact
          </button>
        </div>

        {/* Address & Phone */}
        <div className="flex flex-col gap-4">
          <span className="text-white/50 text-sm">Address &amp; Phone</span>
          <span className="text-white text-sm">4000 Sac Way, Sacramento, 95222</span>
          <span className="text-white text-sm">530-751-5098</span>
        </div>
      </div>
    </footer>
  );
}
