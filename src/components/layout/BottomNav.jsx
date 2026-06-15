import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Newspaper, PlaySquare, Trophy } from "lucide-react";

function FootballIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.8 12c2.2-4.5 5.4-6.8 9.2-6.8s7 2.3 9.2 6.8c-2.2 4.5-5.4 6.8-9.2 6.8S5 16.5 2.8 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.4 12h11.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.2 9.8v4.4M11.1 9.5v5M13 9.5v5M14.9 9.8v4.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M5.1 9.5c1.2 1.1 1.2 3.9 0 5M18.9 9.5c-1.2 1.1-1.2 3.9 0 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
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
  { path: "/playoffs", icon: Trophy, label: "Playoffs" },
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
      className="fixed inset-x-0 bottom-0 z-[80] pointer-events-none bg-black px-3 transform-gpu"
      style={{
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        transform: "translate3d(0,0,0)",
        willChange: "transform",
        contain: "layout paint",
      }}
      aria-label="Hauptnavigation"
    >
      <div className="absolute inset-0 pointer-events-none border-t border-white/12 bg-black" />

      <div className="relative mx-auto grid h-[72px] w-full max-w-[520px] grid-cols-5 gap-3 px-2 pointer-events-auto">
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
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                  isActive
                    ? "bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.16)]"
                    : "text-white/64 active:bg-white/10"
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
