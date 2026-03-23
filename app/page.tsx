import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <main className="single-page-layout">
      <Navbar />

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
    </main>
  );
}
