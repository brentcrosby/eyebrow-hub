import Image from "next/image";

export function Navbar() {
  return (
    <nav className="site-navbar" aria-label="Primary">
      <div className="site-navbar__inner">
        <a className="site-navbar__brand" href="#top">
          Eyebrow Hub
        </a>

        <div className="site-navbar__actions">
          <a className="site-navbar__link" href="#services">
            Services
          </a>
          <a className="site-navbar__link" href="#about">
            About
          </a>
          <a className="site-navbar__phone" href="tel:5307515098">
            <Image
              className="site-navbar__phone-icon"
              src="/assets/phone-icon-outline.svg"
              alt=""
              width={15}
              height={15}
              aria-hidden="true"
            />
            <span className="site-navbar__phone-text">(530)-751-5098</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
