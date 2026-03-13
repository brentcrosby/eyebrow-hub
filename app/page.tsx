import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Senior Project Starter</p>
        <h1>Eyebrow Hub</h1>
        <p className={styles.copy}>
          Clean Next.js repo skeleton for a scheduling site, ready for parallel
          team development.
        </p>
        <nav className={styles.nav} aria-label="Primary">
          <a href="#services">Services</a>
          <a href="#book">Book</a>
          <a href="#contact">Contact</a>
          <a href="#policies">Policies</a>
        </nav>
      </section>
    </main>
  );
}
