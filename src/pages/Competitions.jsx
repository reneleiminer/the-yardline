import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import useSetHeader from "@/hooks/useSetHeader";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2, Trophy } from "lucide-react";

const STATUS_LABELS = {
  upcoming: "Geplant",
  active: "Aktiv",
  completed: "Abgeschlossen",
  inactive: "Inaktiv",
};

const STATUS_STYLES = {
  upcoming: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  active: "border-green-500/30 bg-green-500/10 text-green-300",
  completed: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  inactive: "border-border/60 bg-secondary text-muted-foreground",
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Geplant";
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.upcoming;
}

function getCompetitionTypeLabel(type) {
  const normalized = String(type || "").trim().toLowerCase();

  const labels = {
    playoffs: "Playoffs",
    playoff: "Playoffs",
    cup: "Cup",
    bowl: "Bowl",
    tournament: "Turnier",
    league: "Liga",
  };

  return labels[normalized] || type || "Cup";
}

function isPlayoffCompetition(competition) {
  const type = String(competition?.type || competition?.competitionType || "").trim().toLowerCase();
  return type === "playoffs" || type === "playoff";
}

function CompetitionLogo({ competition }) {
  const logoUrl = competition.logo ? getImageUrl(competition.logo) : "";

  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-black p-2 shadow-[0_10px_22px_rgba(0,0,0,0.32)]">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={competition.name || ""}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
        />
      ) : (
        <Trophy className="h-6 w-6 text-red-500" />
      )}
    </div>
  );
}

function CompetitionRow({ competition }) {
  const status = competition.status || "upcoming";

  return (
    <Link
      to={`/wettbewerbe/${competition.id}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-black/78 px-4 py-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.26)] backdrop-blur transition-all active:scale-[0.99] hover:border-red-500/35"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(194,15,26,0.20),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(47,125,255,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_18px)]" />
      <CompetitionLogo competition={competition} />

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="truncate text-base font-black uppercase italic leading-tight text-white">
            {competition.name || "Wettbewerb"}
          </h2>
        </div>

        <p className="mt-1 truncate text-[11px] font-bold text-white/54">
            {[getCompetitionTypeLabel(competition.type), competition.season].filter(Boolean).join(" · ")}
        </p>
      </div>

      <Badge variant="outline" className={`relative flex-shrink-0 text-[10px] ${getStatusStyle(status)}`}>
        {getStatusLabel(status)}
      </Badge>

      <ChevronRight className="relative h-4 w-4 flex-shrink-0 text-white/38 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Section({ title, competitions }) {
  if (competitions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <h2 className="yardline-heading text-[22px]">
          {title}
        </h2>

        <span className="text-[11px] font-black text-white/45">
          {competitions.length}
        </span>
      </div>

      <div className="space-y-2">
        {competitions.map((competition) => (
          <CompetitionRow key={competition.id} competition={competition} />
        ))}
      </div>
    </section>
  );
}

function CompactEmptyState() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card px-4 py-8 text-center">
      <p className="text-sm font-semibold text-muted-foreground">
        Keine Playoffs gefunden
      </p>
    </div>
  );
}

export default function Competitions() {
  useSetHeader({
    mode: "back",
    title: "Wettbewerbe",
  });

  const { tournaments, tournamentsLoading } = useGlobalData();

  const competitions = useMemo(() => {
    return tournaments
      .filter((competition) => {
        if (!isPlayoffCompetition(competition)) return false;
        if (competition.isPublished === false) return false;
        if (competition.isActive === false && competition.status !== "completed") return false;
        return true;
      })
      .sort((a, b) => {
        const aDate = new Date(a.created_date || a.createdAtUtc || 0).getTime();
        const bDate = new Date(b.created_date || b.createdAtUtc || 0).getTime();
        return bDate - aDate;
      });
  }, [tournaments]);

  const activeCompetitions = competitions.filter((competition) => competition.status === "active");
  const upcomingCompetitions = competitions.filter((competition) => (competition.status || "upcoming") === "upcoming");
  const completedCompetitions = competitions.filter((competition) => competition.status === "completed");
  const otherCompetitions = competitions.filter((competition) => {
    const status = competition.status || "upcoming";
    return !["active", "upcoming", "completed"].includes(status);
  });

  if (tournamentsLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-12 pb-24 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5 pb-24">
      {competitions.length === 0 ? (
        <CompactEmptyState />
      ) : (
        <div className="space-y-6">
          <Section title="Aktiv" competitions={activeCompetitions} />
          <Section title="Geplant" competitions={upcomingCompetitions} />
          <Section title="Abgeschlossen" competitions={completedCompetitions} />
          <Section title="Weitere Wettbewerbe" competitions={otherCompetitions} />
        </div>
      )}
    </div>
  );
}
