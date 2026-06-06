import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Newspaper, RadioTower, Settings, Trophy } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/match-center", icon: RadioTower, label: "Match Center" },
  { path: "/feed", icon: Newspaper, label: "News" },
  { path: "/updates", icon: Trophy, label: "Updates" },
  { path: "/settings", icon: Settings, label: "Account" },
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
      <div className="absolute inset-0 pointer-events-none border-t border-white/10 bg-black" />

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
                    ? "bg-blue-700 text-white border border-blue-500"
                    : "text-white/45 hover:text-white border border-transparent"
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
