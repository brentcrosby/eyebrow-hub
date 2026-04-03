import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        primary: "var(--color-primary)",
      },
      fontSize: {
        h1:       "4rem",    /* 64px */
        h2:       "3rem",    /* 48px */
        h3:       "2.5rem",  /* 40px */
        subtitle: "1.25rem", /* 20px */
        p:        "0.875rem",/* 14px */
      },
    },
  },
} satisfies Config;
