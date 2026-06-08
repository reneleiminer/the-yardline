import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, LockKeyhole } from "lucide-react";
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
    <main className="relative min-h-screen overflow-hidden bg-[#030305] text-white flex items-center justify-center px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-red-700/25 blur-[120px]" />
        <div className="absolute -right-40 top-1/4 h-[520px] w-[520px] rounded-full bg-red-600/25 blur-[140px]" />
        <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[130px]" />
      </div>

      <section className="relative z-10 w-full max-w-3xl text-center py-12">
        <div className="mb-7 flex justify-center">
          <div className="h-24 w-24 rounded-[28px] border border-red-500/45 bg-black/55 shadow-[0_0_45px_rgba(239,0,31,0.22)] flex items-center justify-center p-3">
            <img
              src="/yardline-logo.png"
              alt="The Yardline Logo"
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <p className="text-red-500 text-sm sm:text-base font-black tracking-[0.42em] uppercase mb-5">
          The Yardline
        </p>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[0.95] mb-7 tracking-tight">
          Wir bauen gerade um<span className="text-red-500">.</span>
        </h1>

        <p className="mx-auto max-w-2xl text-white/72 text-base sm:text-lg md:text-xl leading-relaxed mb-8">
          Unsere App ist momentan im Wartungsmodus. Wir arbeiten im Hintergrund
          daran, The Yardline stabiler, schneller und übersichtlicher zu machen.
        </p>

        <div className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-black/45 px-5 py-4 shadow-[0_0_35px_rgba(239,0,31,0.08)]">
          <CalendarDays className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm sm:text-base text-white/80">
            Die App ist voraussichtlich zurück am{" "}
            <span className="font-black text-red-500">{targetLabel}</span>.
          </p>
        </div>

        {!timeLeft.expired ? (
          <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2 sm:gap-5 mb-9">
            <CountdownBox value={timeLeft.days} label="Tage" />
            <CountdownBox value={timeLeft.hours} label="Stunden" />
            <CountdownBox value={timeLeft.minutes} label="Minuten" />
            <CountdownBox value={timeLeft.seconds} label="Sekunden" />
          </div>
        ) : (
          <div className="mx-auto mb-9 max-w-2xl rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4">
            <p className="font-semibold text-red-200">
              Wir sind bald wieder online.
            </p>
          </div>
        )}

        <div className="mx-auto mb-8 h-px max-w-md bg-gradient-to-r from-transparent via-red-500/55 to-transparent" />

        <Link
          to="/settings?login=internal"
          className="inline-flex items-center justify-center gap-2 text-sm text-white/35 hover:text-red-400 transition"
        >
          <LockKeyhole className="h-4 w-4" />
          Admin Login
        </Link>
      </section>
    </main>
  );
}

function CountdownBox({ value, label }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-black/55 px-2 py-5 sm:py-6 shadow-[0_0_28px_rgba(239,0,31,0.12)]">
      <div className="text-3xl sm:text-5xl font-black text-red-500 leading-none">
        {String(value).padStart(2, "0")}
      </div>
      <div className="mt-3 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
    </div>
  );
}
