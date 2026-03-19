export default function Home() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-10 sm:px-8">
      <section className="w-full max-w-[720px] rounded-[24px] border border-slate-200 bg-white/80 p-8 shadow-[0_24px_80px_rgba(20,34,61,0.08)] backdrop-blur-sm sm:p-12">
        <p className="mb-3 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-slate-600">
          Senior Project Starter
        </p>
        <h1 className="mb-4 text-5xl leading-none font-semibold tracking-tight text-slate-950 sm:text-7xl">
          Eyebrow Hub
        </h1>
        <p className="max-w-[48ch] text-[1.05rem] leading-7 text-slate-600">
          Clean Next.js repo skeleton for a scheduling site, ready for parallel
          team development.
        </p>
        <nav className="mt-7 flex flex-wrap gap-3" aria-label="Primary">
          <a
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 font-medium transition hover:bg-slate-100"
            href="#services"
          >
            Services
          </a>
          <a
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 font-medium transition hover:bg-slate-100"
            href="#book"
          >
            Book
          </a>
          <a
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 font-medium transition hover:bg-slate-100"
            href="#contact"
          >
            Contact
          </a>
          <a
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 font-medium transition hover:bg-slate-100"
            href="#policies"
          >
            Policies
          </a>
        </nav>
      </section>
    </main>
  );
}
