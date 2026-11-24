import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eyebrow Hub | Eyebrow & Facial Threading in Yuba City",
  description:
    "Explore eyebrow and facial threading services in Yuba City, request an appointment, and manage your booking with your confirmation number and phone number.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`}>{children}</body>
    </html>
  );
}
