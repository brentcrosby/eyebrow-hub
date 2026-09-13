import { DAY_NAMES } from "@/lib/businessHours";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";

const displayOrder = [1, 2, 3, 4, 5, 6, 0];

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

export default async function BusinessHours() {
  const { businessHours: savedHours } =
    await getAvailabilitySettings();

  const businessHours = displayOrder.map((dayOfWeek) => {
    const day = savedHours.find(
      (item) => item.dayOfWeek === dayOfWeek
    )!;

    return {
      day: DAY_NAMES[dayOfWeek],
      hours: day.enabled
        ? `${formatMinutes(day.openMinutes)} - ${formatMinutes(
            day.closeMinutes
          )}`
        : "Closed",
    };
  });

  return (
    <section id="business-hours" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">
        Business Hours
      </h2>

      <div className="mt-5">
        <div className="space-y-3">
          {businessHours.map((item) => (
            <div
              key={item.day}
              className="flex items-center justify-between border-b border-[#e8e3de] pb-2 text-[13px] text-[#1f1f1f]"
            >
              <span>{item.day}</span>
              <span>{item.hours}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}