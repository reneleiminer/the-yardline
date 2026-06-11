import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Newspaper, PlaySquare } from "lucide-react";

function FootballIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.2 15.7c-.6-3.6.6-6.9 3.2-9.1 2.7-2.2 6.2-2.9 9.6-1.7 1.5.5 2.5 1.5 3 3 .9 3.3-.2 6.6-3 8.9-2.9 2.4-7.1 2.7-10.5.8a4.4 4.4 0 0 1-2.3-1.9Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.4 16.3c2.9-2.4 6.3-5.8 8.7-9.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m9.7 12.7 2 2.4M11.5 10.8l2 2.4M13.2 8.9l2 2.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function FieldIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M4 8h16M4 16h16M12 3.5v17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const navItems = [
  { path: "/", icon: FootballIcon, label: "Home" },
  { path: "/feed", icon: Newspaper, label: "News" },
  { path: "/match-center", icon: FieldIcon, label: "Match Center" },
  { path: "/highlights", icon: PlaySquare, label: "Game Highlights" },
  { path: "/settings", icon: Menu, label: "Menue" },
];

function scrollMainToTop() {
  const main = document.querySelector("main");

  if (main) {
    main.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none bg-black px-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      aria-label="Hauptnavigation"
    >
      <div className="absolute inset-0 pointer-events-none border-t border-white/12 bg-black" />

      <div className="relative mx-auto grid h-[72px] w-full max-w-[520px] grid-cols-5 gap-2 px-1 pointer-events-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              onClick={(event) => {
                if (!isActive) return;
                event.preventDefault();
                scrollMainToTop();
              }}
              className="flex min-w-0 items-center justify-center text-white"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                  isActive
                    ? "bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
                    : "text-white/64 active:bg-white/10"
                }`}
              >
                <Icon className="h-7 w-7" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
