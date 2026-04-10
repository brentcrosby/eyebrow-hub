const businessHours = [
  { day: "Monday", hours: "10:00 am - 8:00 pm" },
  { day: "Tuesday", hours: "10:00 am - 8:00 pm" },
  { day: "Wednesday", hours: "10:00 am - 8:00 pm" },
  { day: "Thursday", hours: "10:00 am - 8:00 pm" },
  { day: "Friday", hours: "10:00 am - 8:00 pm" },
  { day: "Saturday", hours: "10:00 am - 8:00 pm" },
  { day: "Sunday", hours: "11:00 am - 6:00 pm" },
];

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