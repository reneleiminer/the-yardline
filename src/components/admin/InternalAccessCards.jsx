import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Camera, ChevronRight, Newspaper, Radio, ShieldPlus, Star, Table2, Trophy, UsersRound } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasFeatureAccess } from "@/lib/rolePermissions";

const ACCESS_CARDS = [
  {
    key: "gotw",
    title: "Game of the Week",
    description: "Spiel auswählen und Startseiten-GOTW aktualisieren",
    route: "/gotw",
    icon: Star,
    color: "text-yellow-300",
    bg: "bg-yellow-400/10",
  },
  {
    key: "gameday_shots",
    title: "GameDay Shots",
    description: "Mehrere Bilder hochladen und pro Foto einem Verein zuordnen",
    route: "/photographer",
    icon: Camera,
    color: "text-emerald-300",
    bg: "bg-emerald-400/10",
  },
  {
    key: "podcast",
    title: "Podcast",
    description: "Podcast-Folge im Home-Bereich pflegen",
    route: "/podcast",
    icon: Radio,
    color: "text-violet-300",
    bg: "bg-violet-400/10",
  },
  {
    key: "news",
    title: "News & Transfers",
    description: "Beiträge erstellen, bearbeiten und veröffentlichen",
    route: "/news-dashboard",
    icon: Newspaper,
    color: "text-red-300",
    bg: "bg-red-400/10",
  },
  {
    key: "live_results",
    title: "Live Games",
    description: "Live-Spiele öffnen und Ergebnisse eintragen",
    route: "/live-games",
    icon: BarChart3,
    color: "text-blue-300",
    bg: "bg-blue-400/10",
  },
  {
    key: "data_games",
    title: "Spiele",
    description: "Spielplan und Spiele verwalten",
    route: "/admin/games",
    icon: ShieldPlus,
    color: "text-blue-300",
    bg: "bg-blue-400/10",
  },
  {
    key: "data_teams",
    title: "Teams",
    description: "Teams und Teamdaten verwalten",
    route: "/admin/teams",
    icon: UsersRound,
    color: "text-purple-300",
    bg: "bg-purple-400/10",
  },
  {
    key: "data_leagues",
    title: "Ligen",
    description: "Ligen, Gruppen und Logos verwalten",
    route: "/admin/leagues",
    icon: Trophy,
    color: "text-yellow-300",
    bg: "bg-yellow-400/10",
  },
  {
    key: "data_standings",
    title: "Tabellen",
    description: "Tabellen-Konfigurationen verwalten",
    route: "/admin/standings",
    icon: Table2,
    color: "text-cyan-300",
    bg: "bg-cyan-400/10",
  },
  {
    key: "data_highlights",
    title: "Game Highlights",
    description: "Highlight-Videos posten und pflegen",
    route: "/admin/highlights",
    icon: Star,
    color: "text-red-300",
    bg: "bg-red-400/10",
  },
];

export default function InternalAccessCards({ currentKey = "", className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { appUserSnapshot } = useAuth();

  const cards = ACCESS_CARDS.filter(card =>
    card.key !== currentKey &&
    hasFeatureAccess(appUserSnapshot, card.key)
  );

  if (cards.length === 0) return null;

  return (
    <section className={`rounded-[26px] border border-white/10 bg-black/64 p-3 text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)] ${className}`}>
      <div className="mb-3 px-1">
        <h2 className="text-lg font-black italic leading-tight text-white">
          Deine Bereiche
        </h2>
        <p className="mt-1 text-[11px] font-semibold text-white/48">
          Rollenfunktion plus freigeschaltete Zusatzfunktionen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(card.route, { state: { dashboardFrom: location.pathname } })}
              className="group flex min-h-[88px] w-full items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.055] p-3 text-left transition-all hover:border-red-500/45 hover:bg-white/[0.09] active:scale-[0.98]"
            >
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${card.bg} ring-1 ring-white/10`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-sm font-black leading-tight text-white">
                  {card.title}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-white/48">
                  {card.description}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
