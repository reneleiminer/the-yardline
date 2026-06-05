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

function CompetitionLogo({ competition }) {
  const logoUrl = competition.logo ? getImageUrl(competition.logo) : "";

  return (
    <div className="w-12 h-12 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={competition.name || ""}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
        />
      ) : (
        <Trophy className="w-6 h-6 text-primary" />
      )}
    </div>
  );
}

function CompetitionRow({ competition }) {
  const status = competition.status || "upcoming";

  return (
    <Link
      to={`/wettbewerbe/${competition.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3 active:scale-[0.99] hover:border-primary/30 transition-all"
    >
      <CompetitionLogo competition={competition} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-black truncate">
            {competition.name || "Wettbewerb"}
          </h2>
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {[competition.type || "Cup", competition.season].filter(Boolean).join(" · ")}
        </p>
      </div>

      <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getStatusStyle(status)}`}>
        {getStatusLabel(status)}
      </Badge>

      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

function Section({ title, competitions }) {
  if (competitions.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <h2 className="text-sm font-black">
          {title}
        </h2>

        <span className="text-[11px] font-bold text-muted-foreground">
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
        Keine Wettbewerbe gefunden
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