"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-primary px-5 py-12 sm:px-10 sm:py-20">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 sm:flex-row sm:justify-between sm:gap-6">
        {/* Brand + Staff Login */}
        <div className="flex flex-col gap-2 sm:min-h-[116px] sm:justify-between">
          <span className="text-white font-medium text-sm">Eyebrow Hub</span>
          <Link href="/admin/login" className="text-white text-sm font-normal">
            Staff Login
          </Link>
        </div>

        {/* Learn More links */}
        <div className="flex flex-col gap-4">
          <span className="text-white/50 text-sm">Learn More</span>
          <Link href="/#services" className="text-white text-sm">
            Services
          </Link>
          <Link href="/#about" className="text-white text-sm">
            About
          </Link>
          <Link href="/#booking" className="text-white text-sm">
            Contact
          </Link>
          <Link href="/manage-booking" className="text-white text-sm">
            Manage Booking
          </Link>
        </div>

        {/* Address & Phone */}
        <div className="flex flex-col gap-4">
          <span className="text-white/50 text-sm">Address &amp; Phone</span>
          <span className="text-white text-sm">
            1215 Colusa Ave, Yuba City, CA 95991
          </span>
          <span className="text-white text-sm">530-751-5098</span>
        </div>
      </div>
    </footer>
  );
}
