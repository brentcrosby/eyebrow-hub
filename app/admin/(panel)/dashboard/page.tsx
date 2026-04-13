"use client";

type StatCard = {
  title: string;
  value: number;
};

const statCards: StatCard[] = [
  { title: "Pending Requests", value: 2 },
  { title: "Today’s Appointments", value: 3 },
  { title: "This Week", value: 22 },
  { title: "Cancellations", value: 0 },
];

function DashboardStatCard({ title, value }: StatCard) {
  return (
    <div className="rounded-2xl bg-[#f3ebe2] px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-[#7a5a3c]">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-[#6b4f38]">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <main className="min-h-full p-4 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-7xl rounded-[28px] bg-[#fcf8f3] px-5 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-4xl font-semibold text-[#7a5a3c]">
            Admin Panel
          </h1>

          <div className="flex items-center gap-3 text-sm text-[#7a5a3c]">
            <span>Welcome, Owner</span>
            <span className="text-lg">👤</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashboardStatCard
              key={card.title}
              title={card.title}
              value={card.value}
            />
          ))}
        </div>
      </section>
    </main>
  );
}