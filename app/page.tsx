import ServiceList from "@/components/ServiceList";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <main className="single-page-layout">
      <Navbar />

      <section className="hero-cta-shell" aria-label="Quick booking link">
        <div className="hero-cta-frame">
          <a className="hero-cta-button" href="#booking">
            Book Now
          </a>
        </div>
      </section>

      <section className="hero-standin">
        <h1 className="page-title">Eyebrow hub</h1>
      </section>

      <section className="content-shell" aria-label="Business details layout">
        <div className="content-grid">
          <div className="content-column">
            <section id="business-hours" className="content-section">
              <h2 className="section-subtitle">
                <a href="#business-hours">Business Hours</a>
              </h2>
            </section>

            <section id="services" className="content-section">
              <h2 className="section-subtitle">
                <a href="#services">Services</a>
              </h2>
            </section>

            <section id="location" className="content-section">
              <h2 className="section-subtitle">
                <a href="#location">Location</a>
              </h2>
            </section>

            <section id="about" className="content-section">
              <h2 className="section-subtitle">
                <a href="#about">About</a>
              </h2>
            </section>
          </div>

          <aside className="booking-column">
            <section id="booking" className="content-section">
              <h2 className="section-subtitle">
                <a href="#booking">Booking</a>
              </h2>
            </section>
          </aside>
        </div>
      </section>
      <section
        id="book"
        className="mx-auto mt-10 w-full max-w-[720px] rounded-[24px] border border-slate-200 bg-white p-8 shadow-md sm:p-12"
      >
        <h2 className="text-2xl font-semibold text-slate-900">
          Book Online
        </h2>

        <p className="mt-2 text-slate-600">
          Select a service, stylist, and preferred time.
        </p>
        <div className="mt-6">
          <ServiceList />
        </div>
      </section>
    </main>
  );
}
