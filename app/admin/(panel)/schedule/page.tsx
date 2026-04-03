function getCurrentWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const startMonth = startOfWeek.toLocaleString("en-US", { month: "long" });
  const endMonth = endOfWeek.toLocaleString("en-US", { month: "long" });
  const startDay = startOfWeek.getDate();
  const endDay = endOfWeek.getDate();
  const year = startOfWeek.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
}

export default function AdminSchedulePage() {
  const currentWeekRange = getCurrentWeekRange();

  return (
    <main className="min-h-screen p-6">
      <section className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-2xl font-semibold">Schedule</h1>

        <div className="rounded-lg border p-4 shadow-sm">
          <h2 className="text-lg font-medium">{currentWeekRange}</h2>
        </div>
      </section>
    </main>
  );
}