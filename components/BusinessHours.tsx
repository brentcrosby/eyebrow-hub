import {
  DAY_NAMES,
  formatHourLabel,
  getBusinessHoursList,
} from "@/lib/businessHours";

// Monday first for display; the shared list is Sunday first to match getDay().
const displayOrder = [1, 2, 3, 4, 5, 6, 0];

const businessHours = displayOrder.map((dayOfWeek) => {
  const day = getBusinessHoursList()[dayOfWeek];

  return {
    day: DAY_NAMES[dayOfWeek],
    hours: day.closed
      ? "Closed"
      : `${formatHourLabel(day.open).toLowerCase()} - ${formatHourLabel(
          day.close
        ).toLowerCase()}`,
  };
});

export default function BusinessHours() {
  return (
    <section id="business-hours" className="w-full">
      <h2 className="text-subtitle leading-none font-normal">Business Hours</h2>

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
