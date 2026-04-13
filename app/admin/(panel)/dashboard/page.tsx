"use client";

type StatCard = {
  title: string;
  value: number;
};

type BookingRequest = {
  id: number;
  customerName: string;
  serviceName: string;
  appointmentLabel: string;
  phone: string;
  email: string;
};

type ScheduleItem = {
  time: string;
  title: string;
  subtitle?: string;
};

const statCards: StatCard[] = [
  { title: "Pending Requests", value: 2 },
  { title: "Today’s Appointments", value: 3 },
  { title: "This Week", value: 22 },
  { title: "Cancellations", value: 0 },
];

const bookingRequests: BookingRequest[] = [
  {
    id: 1,
    customerName: "Lily Oliver",
    serviceName: "Eyebrow Threading",
    appointmentLabel: "Tomorrow - 10:00 am",
    phone: "(555) 123-4567",
    email: "lilyexample@gmail.com",
  },
  {
    id: 2,
    customerName: "Emily Smith",
    serviceName: "Full Face Threading",
    appointmentLabel: "Tomorrow - 11:00 am",
    phone: "(555) 123-4567",
    email: "emilyexample@gmail.com",
  },
];

const todaysSchedule: ScheduleItem[] = [
  {
    time: "9:00 AM",
    title: "Eyebrow Threading",
    subtitle: "Eyebrow Threading",
  },
  {
    time: "10:00 AM",
    title: "Upper lip",
    subtitle: "Upper lip Threading",
  },
  {
    time: "11:00 AM",
    title: "No Appointment",
  },
  {
    time: "12:00 PM",
    title: "Blocked (Lunch)",
  },
];

function DashboardStatCard({ title, value }: StatCard) {
  return (
    <div className="rounded-2xl bg-[#f3ebe2] px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-[#7a5a3c]">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-[#6b4f38]">{value}</p>
    </div>
  );
}

function BookingRequestCard({
  customerName,
  serviceName,
  appointmentLabel,
  phone,
  email,
}: BookingRequest) {
  return (
    <div className="border-b border-[#e8dac9] px-5 py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-[#7a5a3c]">
            {customerName}
          </h3>
          <p className="mt-2 text-2xl text-[#7a5a3c]">{serviceName}</p>
          <p className="mt-2 text-3xl font-medium text-[#7a5a3c]">
            {appointmentLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            aria-label={`Approve booking request for ${customerName}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-700 text-xl font-bold text-white"
          >
            ✓
          </button>
          <button
            type="button"
            aria-label={`Reject booking request for ${customerName}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-700 text-xl font-bold text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#a08a75]">
        <span>{phone}</span>
        <span className="hidden sm:inline">|</span>
        <span>{email}</span>
      </div>
    </div>
  );
}

function TodaysScheduleCard({ time, title, subtitle }: ScheduleItem) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-4 border-b border-[#e8dac9] py-4 last:border-b-0">
      <p className="text-lg text-[#7a5a3c]">{time}</p>

      <div className="border-l border-[#d8c4ae] pl-4">
        <p className="text-lg text-[#7a5a3c]">{title}</p>
        {subtitle && <p className="text-sm text-[#b19a84]">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <main className="min-h-full p-4 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-7xl rounded-[28px] bg-[#fcf8f3] px-5 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashboardStatCard
              key={card.title}
              title={card.title}
              value={card.value}
            />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1.05fr]">
          <section className="overflow-hidden rounded-3xl border border-[#eadfce] bg-[#fffaf4]">
            <div className="border-b border-[#e8dac9] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#7a5a3c]">
                New Booking Requests
              </h2>
            </div>

            <div>
              {bookingRequests.map((request) => (
                <BookingRequestCard
                  key={request.id}
                  id={request.id}
                  customerName={request.customerName}
                  serviceName={request.serviceName}
                  appointmentLabel={request.appointmentLabel}
                  phone={request.phone}
                  email={request.email}
                />
              ))}
            </div>

            <div className="px-5 py-4 text-xs text-[#c0ab96]">
              Click Green Check-mark to accept a booking request. To reject,
              click the red X.
            </div>
          </section>

          <section className="rounded-3xl border border-[#eadfce] bg-[#fffaf4] px-5 py-4">
            <div className="border-b border-[#e8dac9] pb-3">
              <h2 className="text-lg font-semibold text-[#7a5a3c]">
                Today&apos;s Schedule
              </h2>
            </div>

            <div className="pt-2">
              {todaysSchedule.map((item) => (
                <TodaysScheduleCard
                  key={`${item.time}-${item.title}`}
                  time={item.time}
                  title={item.title}
                  subtitle={item.subtitle}
                />
              ))}
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                className="text-sm font-medium text-[#b39a81] hover:underline"
              >
                View Full Schedule
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
