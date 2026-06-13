import React from "react";
import { Activity } from "lucide-react";
import useSetHeader from "@/hooks/useSetHeader";
import TodaysGamesReminder from "@/components/admin/TodaysGamesReminder";
import InternalAccessCards from "@/components/admin/InternalAccessCards";

export default function LiveGamesDashboard() {
  useSetHeader({
    mode: "dashboard",
    title: "Live Games",
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-24 text-white">
      <section className="mb-5 overflow-hidden rounded-[28px] border border-white/10 bg-black text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <div className="relative p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(194,15,26,0.32),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(47,125,255,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-80" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/12">
              <Activity className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-red-500">
                Live Control
              </p>
              <h1 className="mt-1 text-2xl font-black italic leading-none">
                Live Games
              </h1>
              <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-white/58">
                Laufende Spiele nach Liga öffnen und Ergebnisse live oder final eintragen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <InternalAccessCards currentKey="live_results" className="mb-5" />
      <TodaysGamesReminder />
    </div>
  );
}
