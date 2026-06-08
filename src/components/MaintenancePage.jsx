import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function getTimeLeft(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    expired: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function MaintenancePage() {
  const maintenanceUntil =
    import.meta.env.VITE_MAINTENANCE_UNTIL || "2026-06-12T00:00:00+02:00";

  const targetLabel = useMemo(() => {
    const date = new Date(maintenanceUntil);

    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [maintenanceUntil]);

  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(maintenanceUntil));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(maintenanceUntil));
    }, 1000);

    return () => clearInterval(timer);
  }, [maintenanceUntil]);

  return (
    <main className="min-h-screen bg-[#05070d] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
            <span className="text-3xl">🏈</span>
          </div>
        </div>

        <p className="text-blue-400 text-sm font-semibold tracking-[0.3em] uppercase mb-4">
          The Yardline
        </p>

        <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-5">
          Wir bauen gerade um.
        </h1>

        <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8">
          Unsere App ist momentan im Wartungsmodus. Wir arbeiten im Hintergrund
          daran, The Yardline stabiler, schneller und übersichtlicher zu machen.
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 mb-8">
          <p className="text-white/50 text-sm mb-4">
            Voraussichtlich wieder verfügbar ab dem
          </p>

          <p className="text-2xl sm:text-3xl font-black mb-5">
            {targetLabel}
          </p>

          {!timeLeft.expired ? (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <CountdownBox value={timeLeft.days} label="Tage" />
              <CountdownBox value={timeLeft.hours} label="Std." />
              <CountdownBox value={timeLeft.minutes} label="Min." />
              <CountdownBox value={timeLeft.seconds} label="Sek." />
            </div>
          ) : (
            <p className="text-blue-300 font-semibold">
              Wir sind bald wieder online.
            </p>
          )}
        </div>

        <p className="text-white/45 text-sm mb-10">
          Danke für eure Geduld. Wir wollen euch keinen halbfertigen Zugang
          geben, sondern eine App, die sich wirklich gut anfühlt.
        </p>

        <div className="pt-6 border-t border-white/10">
          <Link
            to="/admin-login"
            className="text-xs text-white/35 hover:text-white/70 transition"
          >
            Admin Login
          </Link>
        </div>
      </div>
    </main>
  );
}

function CountdownBox({ value, label }) {
  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 px-2 py-4">
      <div className="text-2xl sm:text-3xl font-black">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[11px] sm:text-xs text-white/45 mt-1">
        {label}
      </div>
    </div>
  );
}
