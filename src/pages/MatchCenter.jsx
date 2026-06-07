import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { BarChart3, CalendarDays, ChevronRight, Loader2, Search, Trophy } from "lucide-react";

import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";
import { sortLeagues } from "@/lib/leagueSort";

const MATCH_TABS = [
  { key: "games", label: "Games" },
  { key: "leagues", label: "Ligen" },
  { key: "tournaments", label: "Tournaments" },
];

function getGameDate(game) {
  if (game?.date) {
    const rawTime = game.time || game.kickoffTime || "00:00";
    const [year, month, day] = String(game.date).split("-").map(Number);
    const [hour, minute] = String(rawTime).split(":").map(Number);

    if (year && month && day) {
      return new Date(
        year,
        month - 1,
        day,
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0,
        0,
        0
      );
    }
  }

  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}

function getEffectiveGameStatus(game) {
  if (!game) return "scheduled";
  if (game.status === "cancelled") return "cancelled";
  if (game.status === "final") return "final";
  if (game.status === "live") return "live";

  const kickoff = getGameDate(game);
  if (!kickoff) return game.status || "scheduled";

  if ((game.status || "scheduled") === "scheduled" && Date.now() >= kickoff.getTime()) {
    return "live";
  }

  return game.status || "scheduled";
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || "Offen";
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function StatusBadge({ game }) {
  const status = getEffectiveGameStatus(game);

  const config = {
    live: "bg-red-600 text-white border-red-500",
    final: "bg-black text-white border-black",
    cancelled: "bg-zinc-700 text-white border-zinc-600",
    scheduled: "bg-blue-700 text-white border-blue-500",
  }[status] || "bg-blue-700 text-white border-blue-500";

  const label = {
    live: "LIVE",
    final: "FINAL",
    cancelled: "ABGESAGT",
    scheduled: "GEPLANT",
  }[status] || "GEPLANT";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${config}`}>
      {label}
    </span>
  );
}

function TeamLogo({ team, fallback, color }) {
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-white p-2"
      style={{ boxShadow: `inset 0 -4px 0 ${color || "#005bff"}` }}
    >
      {team?.logo ? (
        <img
          src={getImageUrl(team.logo)}
          alt={team.name || ""}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-black text-black">{team?.shortName?.[0] || team?.name?.[0] || fallback?.[0] || "?"}</span>
      )}
    </div>
  );
}

function MatchScoreCard({ game, teamsById, leaguesById, compact = false }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || "#005bff");
  const awayColor = getTeamColor(away, "#ef233c");
  const status = getEffectiveGameStatus(game);
  const showScore = status === "live" || status === "final";
  const kickoff = getGameDate(game);

  return (
    <Link
      to={`/game/${game.id}`}
      className="block overflow-hidden rounded-[26px] border border-black/10 bg-white text-black active:scale-[0.99] transition-transform"
    >
      <div className="grid grid-cols-[6px_1fr_6px]">
        <div style={{ background: homeColor }} />

        <div className="px-3 py-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-wide text-zinc-500">
                {league?.shortName || league?.name || "Match"}
              </p>
              <p className="truncate text-[11px] font-bold text-zinc-500">
                {kickoff ? format(kickoff, "EEE dd.MM. HH:mm", { locale: de }) : "Termin offen"}
              </p>
            </div>

            <StatusBadge game={game} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0">
              <TeamLogo team={home} fallback={homeName} color={homeColor} />
              <p className="mt-2 text-sm font-black leading-tight text-black whitespace-normal break-words">
                {homeName}
              </p>
            </div>

            <div className="flex min-w-[78px] flex-col items-center justify-center rounded-2xl bg-black px-3 py-2 text-white">
              {showScore ? (
                <div className="flex items-center gap-2 text-2xl font-black tabular-nums">
                  <span>{game.scoreHome ?? 0}</span>
                  <span className="text-white/35">:</span>
                  <span>{game.scoreAway ?? 0}</span>
                </div>
              ) : (
                <>
                  <span className="text-xl font-black">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}</span>
                  <span className="text-[9px] font-black uppercase text-white/50">
                    {kickoff ? "Kickoff" : "Offen"}
                  </span>
                </>
              )}
            </div>

            <div className="min-w-0 text-right">
              <div className="flex justify-end">
                <TeamLogo team={away} fallback={awayName} color={awayColor} />
              </div>
              <p className="mt-2 text-sm font-black leading-tight text-black whitespace-normal break-words">
                {awayName}
              </p>
            </div>
          </div>

          {!compact && (game.roundName || game.venue || game.city) && (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              {game.roundName && <span>{game.roundName}</span>}
              {game.venue && <span>{game.venue}</span>}
              {game.city && <span>{game.city}</span>}
            </div>
          )}
        </div>

        <div style={{ background: awayColor }} />
      </div>
    </Link>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Team, Liga, Spiel oder Tournament suchen"
        className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold text-black outline-none placeholder:text-zinc-400 focus:border-blue-600"
      />
    </div>
  );
}

function TabSwitch({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 rounded-2xl border border-black/10 bg-white p-1">
      {MATCH_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`h-10 rounded-xl text-xs font-black transition-colors ${
            value === tab.key
              ? "bg-blue-700 text-white"
              : "text-zinc-500 hover:text-black"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="truncate text-lg font-black text-black">{title}</h2>
      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-black">{count}</span>
    </div>
  );
}

function GamesPanel({ games, teamsById, leaguesById }) {
  const [mode, setMode] = useState("today");
  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const sevenDaysAgo = useMemo(() => subDays(today, 7), [today]);
  const sevenDaysAhead = useMemo(() => addDays(today, 14), [today]);

  const visibleGames = useMemo(() => {
    return games
      .filter((game) => {
        const date = getGameDate(game);
        if (!date) return false;
        const status = getEffectiveGameStatus(game);

        if (mode === "live") return status === "live";
        if (mode === "today") return isSameDay(date, today);
        if (mode === "upcoming") {
          return status !== "final" && status !== "cancelled" && !isBefore(date, tomorrow) && isBefore(date, addDays(sevenDaysAhead, 1));
        }

        return (status === "final" || status === "cancelled") && !isBefore(date, sevenDaysAgo) && isBefore(date, today);
      })
      .sort((a, b) => {
        const dateA = getGameDate(a)?.getTime() || 0;
        const dateB = getGameDate(b)?.getTime() || 0;
        return mode === "past" ? dateB - dateA : dateA - dateB;
      });
  }, [games, mode, sevenDaysAgo, sevenDaysAhead, today, tomorrow]);

  const modes = [
    { key: "live", label: "Live" },
    { key: "today", label: "Heute" },
    { key: "upcoming", label: "Kommend" },
    { key: "past", label: "Final" },
  ];

  return (
    <section>
    <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl border border-black/10 bg-white p-1">
        {modes.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            className={`h-10 rounded-xl text-[11px] font-black ${
              mode === item.key ? "bg-red-600 text-white" : "text-zinc-500"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <SectionHeader title="Games" count={visibleGames.length} />

      {visibleGames.length === 0 ? (
        <EmptyState label="Keine Spiele in dieser Ansicht." />
      ) : (
        <div className="space-y-3">
          {visibleGames.map((game) => (
            <MatchScoreCard
              key={game.id}
              game={game}
              teamsById={teamsById}
              leaguesById={leaguesById}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LeagueRow({ league }) {
  const meta = [
    league.tierLabel,
    league.regionState || league.stateRegion || league.country,
    league.season,
  ].filter(Boolean);

  return (
    <Link
      to={`/tabellen/${league.id}`}
      className="flex items-center gap-3 rounded-[24px] border border-black/10 bg-white p-3 text-black active:scale-[0.99] transition-transform"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-black p-2">
        {league.logo ? (
          <img src={getImageUrl(league.logo)} alt={league.name || ""} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <BarChart3 className="h-5 w-5 text-blue-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black">{league.name}</h3>
        <p className="truncate text-[11px] font-bold text-zinc-500">{meta.join(" · ")}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
    </Link>
  );
}

function LeaguesPanel({ leagues }) {
  const sortedLeagues = useMemo(() => sortLeagues(leagues), [leagues]);

  return (
    <section>
      <SectionHeader title="Ligen & Tabellen" count={sortedLeagues.length} />
      {sortedLeagues.length === 0 ? (
        <EmptyState label="Keine Ligen gefunden." />
      ) : (
        <div className="space-y-3">
          {sortedLeagues.map((league) => (
            <LeagueRow key={league.id} league={league} />
          ))}
        </div>
      )}
    </section>
  );
}

function getTournamentStatusLabel(status) {
  if (status === "active") return "Aktiv";
  if (status === "completed") return "Final";
  if (status === "inactive") return "Inaktiv";
  return "Geplant";
}

function TournamentRow({ tournament }) {
  return (
    <Link
      to={`/wettbewerbe/${tournament.id}`}
      className="flex items-center gap-3 rounded-[24px] border border-black/10 bg-white p-3 text-black active:scale-[0.99] transition-transform"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-black p-2">
        {tournament.logo ? (
          <img src={getImageUrl(tournament.logo)} alt={tournament.name || ""} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <Trophy className="h-6 w-6 text-blue-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black">{tournament.name || "Tournament"}</h3>
        <p className="truncate text-[11px] font-bold text-zinc-500">
          {[tournament.type || "Cup", tournament.season].filter(Boolean).join(" · ")}
        </p>
      </div>
      <span className="rounded-full bg-blue-700 px-2.5 py-1 text-[10px] font-black text-white">
        {getTournamentStatusLabel(tournament.status)}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
    </Link>
  );
}

function TournamentsPanel({ tournaments }) {
  const visibleTournaments = useMemo(() => {
    return tournaments
      .filter((item) => item.isPublished !== false)
      .filter((item) => item.isActive !== false || item.status === "completed")
      .sort((a, b) => {
        const dateA = new Date(a.created_date || a.createdAtUtc || 0).getTime();
        const dateB = new Date(b.created_date || b.createdAtUtc || 0).getTime();
        return dateB - dateA;
      });
  }, [tournaments]);

  return (
    <section>
      <SectionHeader title="Tournaments" count={visibleTournaments.length} />
      {visibleTournaments.length === 0 ? (
        <EmptyState label="Keine Tournaments gefunden." />
      ) : (
        <div className="space-y-3">
          {visibleTournaments.map((tournament) => (
            <TournamentRow key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-[22px] bg-white px-4 py-8 text-center">
      <p className="text-sm font-bold text-black/45">{label}</p>
    </div>
  );
}

export default function MatchCenter() {
  const {
    games,
    teams,
    leagues,
    tournaments,
    gamesLoading,
    leaguesLoading,
    tournamentsLoading,
  } = useGlobalData();

  const [activeTab, setActiveTab] = useState("games");
  const [search, setSearch] = useState("");

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);

  const query = search.trim().toLowerCase();

  const filteredGames = useMemo(() => {
    if (!query) return games;

    return games.filter((game) => {
      const home = teamsById.get(game.homeTeamId);
      const away = teamsById.get(game.awayTeamId);
      const league = leaguesById.get(game.leagueId);

      return [
        home?.name,
        home?.shortName,
        away?.name,
        away?.shortName,
        league?.name,
        league?.shortName,
        game.homeTeamPlaceholder,
        game.awayTeamPlaceholder,
        game.roundName,
        game.venue,
        game.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [games, leaguesById, query, teamsById]);

  const filteredLeagues = useMemo(() => {
    if (!query) return leagues;

    return leagues.filter((league) => [
      league.name,
      league.shortName,
      league.country,
      league.regionState,
      league.stateRegion,
      league.season,
      league.tierLabel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query));
  }, [leagues, query]);

  const filteredTournaments = useMemo(() => {
    if (!query) return tournaments;

    return tournaments.filter((tournament) => [
      tournament.name,
      tournament.type,
      tournament.season,
      tournament.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query));
  }, [query, tournaments]);

  const isLoading = gamesLoading || leaguesLoading || tournamentsLoading;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="space-y-4">
        <div className="mb-1">
          <h1 className="text-4xl font-black italic tracking-normal text-black">Match Center</h1>
        </div>

        <SearchBox value={search} onChange={setSearch} />
        <TabSwitch value={activeTab} onChange={setActiveTab} />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {activeTab === "games" && (
              <GamesPanel
                games={filteredGames}
                teamsById={teamsById}
                leaguesById={leaguesById}
              />
            )}

            {activeTab === "leagues" && (
              <LeaguesPanel leagues={filteredLeagues} />
            )}

            {activeTab === "tournaments" && (
              <TournamentsPanel tournaments={filteredTournaments} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
