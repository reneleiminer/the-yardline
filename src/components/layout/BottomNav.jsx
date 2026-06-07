import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Newspaper, PlaySquare } from "lucide-react";

function FootballIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 15.8C2.9 12 4 8.1 7.3 6.2c3.3-1.9 8-1.5 12.2 1.9.2 5.4-2.3 9.3-6.3 10.5-3.5 1.1-6.7 0-8.7-2.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.2 8.1 16 15.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m10.6 10.5 2.1-2.1M12.7 12.6l2.1-2.1M14.8 14.7l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  { path: "/match-center", icon: FieldIcon, label: "Match Center" },
  { path: "/feed", icon: Newspaper, label: "News" },
  { path: "/highlights", icon: PlaySquare, label: "Game Highlights" },
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
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Hauptnavigation"
    >
      <div className="absolute inset-0 pointer-events-none border-t border-black/10 bg-white" />

      <div className="relative grid h-[76px] w-full grid-cols-4 px-4 pt-2 pointer-events-auto">
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
              className="flex min-w-0 flex-col items-center justify-start gap-1 text-black"
            >
              <Icon className={`h-6 w-6 ${isActive ? "text-red-700" : "text-black/65"}`} />
              <span className={`max-w-full truncate text-[9px] font-black ${isActive ? "text-red-700" : "text-black/55"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
