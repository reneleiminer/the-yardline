import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Newspaper, PlaySquare } from "lucide-react";

function FootballIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.8 15.9C3.1 12.5 4.4 8.8 7.4 6.7c3.6-2.5 8.4-2 12.9 1.6.1 4.8-2 8.3-5.9 9.8-3.9 1.5-7.9.7-10.6-2.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.8 8.6 16 16.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m10.4 10.9 2.2-2.2M12.6 13.1l2.2-2.2M14.8 15.3l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3"
      style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
      aria-label="Hauptnavigation"
    >
      <div className="absolute inset-0 pointer-events-none border-t border-red-900/20 bg-red-700" />

      <div className="relative grid h-[68px] w-full grid-cols-5 px-3 pointer-events-auto">
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
              <Icon className={`h-7 w-7 ${isActive ? "text-white" : "text-white/62"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
