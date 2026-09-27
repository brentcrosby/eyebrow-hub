import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/Footer";
import ManageBookingForm from "@/components/ManageBookingForm";

export const metadata: Metadata = {
  title: "Manage Booking | Eyebrow Hub",
  description: "Look up or cancel an Eyebrow Hub booking.",
  robots: { index: false, follow: false },
};

export default function ManageBookingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fffaf4]">
      <Navbar />
      <main className="mx-auto w-full max-w-[800px] flex-1 px-5 py-10 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-semibold text-[#5e3d1e]">
          Manage Booking
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e3d1e]">
          Enter your confirmation number and the phone number used when booking.
          No account is needed.
        </p>
        <ManageBookingForm />
      </main>
      <Footer />
    </div>
  );
}
