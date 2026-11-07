import { db } from "@/lib/db";
import { DAY_NAMES } from "@/lib/businessHours";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/availabilitySettings";

const displayOrder = [1, 2, 3, 4, 5, 6, 0];

type DayHours = {
  dayOfWeek: number;
  enabled: boolean;
  openMinutes: number;
  closeMinutes: number;
};

export type PublicBusinessHours =
  | { status: "ok"; days: { day: string; hours: string }[] }
  // No hours saved yet (empty database): never present demo defaults as real hours.
  | { status: "unpublished" }
  // Database down or the query failed.
  | { status: "unavailable" };

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const minute = String(minutes % 60).padStart(2, "0");
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

type BusinessHourClient = {
  businessHour: { findMany(args: object): Promise<DayHours[]> };
};

/**
 * Read on every request (the homepage is force-dynamic), so hours saved in
 * admin show after a reload on a production build with no rebuild.
 */
export async function loadPublicBusinessHours(
  client: BusinessHourClient = db
): Promise<PublicBusinessHours> {
  let saved: DayHours[];

  try {
    saved = await client.businessHour.findMany({
      orderBy: { dayOfWeek: "asc" },
    });
  } catch (error) {
    console.error("Failed to load business hours for the homepage:", error);
    return { status: "unavailable" };
  }

  if (!Array.isArray(saved) || saved.length === 0) {
    return { status: "unpublished" };
  }

  // Days missing from a partial save use the same defaults booking uses.
  const byDay = new Map(saved.map((row) => [row.dayOfWeek, row]));

  return {
    status: "ok",
    days: displayOrder.map((dayOfWeek) => {
      const day =
        byDay.get(dayOfWeek) ??
        DEFAULT_BUSINESS_HOURS.find((row) => row.dayOfWeek === dayOfWeek)!;

      return {
        day: DAY_NAMES[dayOfWeek],
        hours: day.enabled
          ? `${formatMinutes(day.openMinutes)} - ${formatMinutes(day.closeMinutes)}`
          : "Closed",
      };
    }),
  };
}

const FALLBACK_MESSAGES = {
  unpublished:
    "Our business hours will be posted here soon. You can still request a booking below, or use the contact details at the bottom of this page.",
  unavailable:
    "We can't show our business hours right now. Please refresh in a moment, or use the contact details at the bottom of this page.",
};

export default async function BusinessHours() {
  const result = await loadPublicBusinessHours();

  return (
    <section id="business-hours" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">
        Business Hours
      </h2>

      <div className="mt-5">
        {result.status === "ok" ? (
          <div className="space-y-3">
            {result.days.map((item) => (
              <div
                key={item.day}
                className="flex items-center justify-between border-b border-[#e8e3de] pb-2 text-[13px] text-[#1f1f1f]"
              >
                <span>{item.day}</span>
                <span>{item.hours}</span>
              </div>
            ))}
          </div>
        ) : (
          <p
            role="status"
            data-business-hours-fallback={result.status}
            className="text-[13px] leading-6 text-[#1f1f1f]"
          >
            {FALLBACK_MESSAGES[result.status]}
          </p>
        )}
      </div>
    </section>
  );
}
