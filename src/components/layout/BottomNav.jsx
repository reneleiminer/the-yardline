import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Home, PlaySquare, Trophy } from "lucide-react";

function FieldIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 7h16" />
      <path d="M4 17h16" />
      <path d="M12 3v18" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M8 5v14" opacity="0.45" />
      <path d="M16 5v14" opacity="0.45" />
    </svg>
  );
}

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/spiele", icon: FieldIcon, label: "Spiele" },
  { path: "/highlights", icon: PlaySquare, label: "Highlights" },
  { path: "/wettbewerbe", icon: Trophy, label: "Cups" },
  { path: "/tabellen", icon: BarChart3, label: "Tabellen" },
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
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Hauptnavigation"
    >
      <div className="absolute inset-0 pointer-events-none bg-black/94 border-t border-primary/25 backdrop-blur-xl shadow-[0_-10px_34px_rgba(0,91,255,0.12)]" />

      <div className="relative grid grid-cols-5 h-[78px] w-full px-2 pt-2.5 pointer-events-auto">
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
              className="flex items-start justify-center min-w-0 transition-all"
            >
              <div
                className={`rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-primary/18 text-primary border border-primary/35 shadow-[0_0_22px_rgba(0,91,255,0.32)]"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
                style={{
                  width: 54,
                  height: 54,
                }}
              >
                <Icon className="w-6 h-6" />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}