"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import brownLogo from "@/app/assests/logos/brown logo.png";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Schedule",
    href: "/admin/schedule",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Services",
    href: "/admin/services",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <polyline points="3 6 4 7 6 5" />
        <polyline points="3 12 4 13 6 11" />
        <polyline points="3 18 4 19 6 17" />
      </svg>
    ),
  },
  {
    label: "Availability",
    href: "/admin/availability",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function AdminSideNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("adminAccessToken");
    document.cookie =
      "adminAccessToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/admin/login");
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col bg-[#FFFAF4] px-8 py-8 shadow-[2px_0_12px_rgba(167,140,122,0.15)]">
      <div className="flex flex-col items-center gap-2 mb-10">
        <Image
          src={brownLogo}
          alt="Eyebrow Hub"
          width={155}
          height={45}
          className="object-contain"
        />
        <p className="text-sm tracking-widest text-[#A78C7A]">Admin Panel</p>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-4 rounded-xl px-5 py-3 text-base font-medium transition-colors ${
                isActive
                  ? "bg-[rgba(167,140,122,0.3)] text-[#5e3d1e]"
                  : "text-[#7a5a3c] hover:bg-[rgba(167,140,122,0.15)] hover:text-[#5e3d1e]"
              }`}
            >
              <span className={isActive ? "text-[#5e3d1e]" : "text-[#A78C7A]"}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-4 rounded-xl px-5 py-3 text-base font-medium text-[#7a5a3c] transition-colors hover:bg-[rgba(167,140,122,0.15)] hover:text-[#5e3d1e]"
        >
          <span className="text-[#A78C7A]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          Log Out
        </button>
      </nav>
    </aside>
  );
}

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token =
    typeof window === "undefined"
      ? null
      : localStorage.getItem("adminAccessToken");

  useEffect(() => {
    if (!token) {
      router.replace("/admin/login");
    }
  }, [router, token]);

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f1eb]">
      <AdminSideNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
