"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  formatPacificDateTime,
  getCancellationAvailability,
  type ManagedBooking,
} from "@/lib/manageBooking";

const NOT_FOUND =
  "We couldn't find a booking with those details. Please check them and try again.";
const FIELD =
  "mt-2 w-full min-w-0 rounded-lg border border-[#cdbca9] bg-white px-4 py-3 text-base text-[#33251b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a5a3c]";
const BUTTON =
  "rounded-lg bg-[#7a5a3c] px-5 py-3 text-base font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5e3d1e] disabled:cursor-not-allowed disabled:opacity-60";

export default function ManageBookingForm() {
  const [bookingReference, setBookingReference] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<"lookup" | "cancel" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearInterval(interval);
      requestVersion.current += 1;
    };
  }, []);

  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (error || notice) feedback.current?.focus();
  }, [error, notice]);

  function clearBooking() {
    // An old response must never overwrite results for newly entered credentials.
    requestVersion.current += 1;
    setBooking(null);
    setConfirming(false);
    setNotice("");
    setError("");
    setRefreshRequired(false);
  }

  function closeConfirmation() {
    setConfirming(false);
    requestAnimationFrame(() => cancelButton.current?.focus());
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const version = ++requestVersion.current;
    setBooking(null);
    setConfirming(false);
    setError("");
    setNotice("");
    setRefreshRequired(false);
    // Keep malformed and unmatched credentials indistinguishable to the user.
    if (
      !/^[\da-f]{16}$/i.test(bookingReference.trim()) ||
      phone.length > 32 ||
      phone.replace(/\D/g, "").length !== 10
    ) {
      setError(NOT_FOUND);
      return;
    }
    inFlight.current = true;
    setPending("lookup");
    try {
      const response = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          bookingReference: bookingReference.trim(),
          phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (version !== requestVersion.current) return;
      if (response.ok && data?.booking?.services?.length > 0) {
        setBooking(data.booking);
        setNow(Date.now());
      } else {
        setError(
          response.status === 404
            ? NOT_FOUND
            : "We couldn't load your booking. Please try again."
        );
      }
    } catch {
      if (version === requestVersion.current)
        setError("We couldn't load your booking. Please try again.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  async function handleCancel() {
    if (inFlight.current || !booking || !confirming) return;
    setNow(Date.now());
    if (getCancellationAvailability(booking, new Date()) !== "available") {
      setConfirming(false);
      setError(
        "This booking cannot be cancelled online. Please check the four-hour policy below."
      );
      return;
    }
    const version = ++requestVersion.current;
    inFlight.current = true;
    setPending("cancel");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          bookingReference: booking.bookingReference,
          phone,
        }),
      });
      if (version !== requestVersion.current) return;
      setConfirming(false);
      if (response.ok) {
        setBooking({
          ...booking,
          services: booking.services.map((service) => ({
            ...service,
            status: "cancelled",
          })),
        });
        setNotice("Your entire booking has been cancelled.");
      } else if (response.status === 404) {
        setBooking(null);
        setError(NOT_FOUND);
      } else if (response.status === 409) {
        setRefreshRequired(true);
        setError(
          "Cancellation was not completed. The booking may be within four hours of its start or its status may have changed. Look it up again for the latest details."
        );
      } else {
        setRefreshRequired(true);
        setError("Cancellation could not be completed. Please try again.");
      }
    } catch {
      if (version === requestVersion.current) {
        setConfirming(false);
        setRefreshRequired(true);
        setError(
          "Cancellation could not be completed. Look up your booking again before retrying."
        );
      }
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  const availability =
    booking && getCancellationAvailability(booking, new Date(now));

  return (
    <div className="mt-8 space-y-8">
      <form
        onSubmit={handleLookup}
        className="space-y-5 rounded-xl bg-white p-5 shadow-sm sm:p-8"
      >
        <div>
          <label
            htmlFor="manage-reference"
            className="block text-sm font-medium text-[#33251b]"
          >
            Confirmation number
          </label>
          <input
            id="manage-reference"
            value={bookingReference}
            onChange={(event) => {
              setBookingReference(event.target.value);
              clearBooking();
            }}
            autoComplete="off"
            spellCheck={false}
            className={FIELD}
            disabled={pending === "cancel"}
          />
        </div>
        <div>
          <label
            htmlFor="manage-phone"
            className="block text-sm font-medium text-[#33251b]"
          >
            Booking phone number
          </label>
          <input
            id="manage-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearBooking();
            }}
            className={FIELD}
            disabled={pending === "cancel"}
          />
        </div>
        <button
          type="submit"
          disabled={pending !== null}
          className={`w-full sm:w-auto ${BUTTON}`}
        >
          {pending === "lookup" ? "Looking up booking…" : "Find booking"}
        </button>
      </form>

      {error && (
        <p
          ref={feedback}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          ref={feedback}
          tabIndex={-1}
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900"
        >
          {notice}
        </p>
      )}

      {booking && (
        <section
          aria-labelledby="booking-details"
          className="space-y-6 rounded-xl bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <h2
              id="booking-details"
              className="text-xl font-semibold text-[#5e3d1e]"
            >
              Booking details
            </h2>
            <p className="mt-2 break-all text-sm text-[#33251b]">
              Confirmation number: {booking.bookingReference}
            </p>
          </div>
          <ul className="space-y-4">
            {booking.services.map((service, index) => (
              <li
                key={`${service.startTime}-${index}`}
                className="rounded-lg border border-[#eadfce] p-4"
              >
                <h3 className="break-words font-semibold text-[#33251b]">
                  {service.name}
                </h3>
                <dl className="mt-2 space-y-1 text-sm leading-6 text-[#33251b]">
                  <div>
                    <dt className="inline font-medium">Stylist: </dt>
                    <dd className="inline">
                      {service.stylistName ?? "Stylist not assigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Date and time: </dt>
                    <dd className="inline">
                      {formatPacificDateTime(service.startTime)} –{" "}
                      {formatPacificDateTime(service.endTime)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Status: </dt>
                    <dd className="inline capitalize">{service.status}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-[#5e3d1e]">
            Cancellation policy: The entire booking may be cancelled only while
            all services are pending or confirmed and the first service starts
            more than four hours from now.
          </p>
          {availability === "available" && !confirming && !refreshRequired && (
            <button
              ref={cancelButton}
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending !== null}
              className={`w-full sm:w-auto ${BUTTON}`}
            >
              Request cancellation
            </button>
          )}
          {availability === "already-cancelled" && (
            <p className="text-sm font-medium text-[#5e3d1e]">
              This booking is cancelled.
            </p>
          )}
          {availability === "status" && (
            <p className="text-sm text-[#5e3d1e]">
              This booking is not eligible for online cancellation because of
              its status.
            </p>
          )}
          {availability === "cutoff" && (
            <p className="text-sm text-[#5e3d1e]">
              Online cancellation is unavailable within four hours of the first
              service.
            </p>
          )}
          {confirming && (
            <div
              role="group"
              aria-labelledby="cancel-heading"
              className="space-y-4 rounded-lg border-2 border-[#7a5a3c] bg-[#fffaf4] p-4"
            >
              <h3 id="cancel-heading" className="font-semibold text-[#5e3d1e]">
                Cancel the entire booking?
              </h3>
              <p className="text-sm leading-6 text-[#33251b]">
                This will cancel every service in this booking. Cancellation is
                allowed only more than four hours before the first service
                starts.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={closeConfirmation}
                  disabled={pending !== null}
                  className="rounded-lg border border-[#7a5a3c] px-5 py-3 text-[#5e3d1e] disabled:opacity-60"
                >
                  Keep booking
                </button>
                <button
                  ref={confirmButton}
                  type="button"
                  onClick={handleCancel}
                  disabled={pending !== null}
                  className={BUTTON}
                >
                  {pending === "cancel"
                    ? "Cancelling…"
                    : "Yes, cancel all services"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
