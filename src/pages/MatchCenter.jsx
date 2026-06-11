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
import { BarChart3, ChevronRight, Loader2, Search, Trophy } from "lucide-react";

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
  return "scheduled";
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || "Offen";
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function withAlpha(hex, alpha = "18") {
  const value = String(hex || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return `${value}${alpha}`;
  return `#eef2ff`;
}

function StatusBadge({ game }) {
  const status = getEffectiveGameStatus(game);
  if (status === "scheduled") return null;

  const config = {
    final: "bg-black text-white border-black",
    cancelled: "bg-red-700 text-white border-red-700",
  }[status] || "bg-blue-700 text-white border-blue-500";

  const label = {
    final: "FINAL",
    cancelled: "ABGESAGT",
  }[status] || "";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${config}`}>
      {label}
    </span>
  );
}

function TeamLogo({ team, fallback, color }) {
  if (!team?.logo) return null;

  return (
    <img
      src={getImageUrl(team.logo)}
      alt={team.name || ""}
      className="h-20 w-20 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      loading="lazy"
    />
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
  const showScore = status === "final";
  const kickoff = getGameDate(game);

  return (
    <Link
      to={`/game/${game.id}`}
      className="block overflow-hidden rounded-[28px] bg-white text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] active:scale-[0.99] transition-transform"
    >
      <div className="relative grid min-h-[150px] grid-cols-2 overflow-hidden">
        <div className="relative flex flex-col justify-between p-4" style={{ background: homeColor }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-black/20" />
          <div className="relative z-10 flex items-start justify-start gap-2">
            <TeamLogo team={home} fallback={homeName} color={homeColor} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-white/70">
                {league?.shortName || league?.name || "Match"}
              </p>
              <p className="text-[10px] font-bold text-white/60">
                {kickoff ? format(kickoff, "dd.MM.", { locale: de }) : "Offen"}
              </p>
            </div>
          </div>
          <p className="relative z-10 pr-12 line-clamp-2 text-lg font-black leading-tight">
            {homeName}
          </p>
        </div>

        <div className="relative flex flex-col justify-between p-4 text-right" style={{ background: awayColor }}>
          <div className="absolute inset-0 bg-gradient-to-bl from-white/18 via-transparent to-black/20" />
          <div className="relative z-10 flex items-start justify-end gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-white/70">
                {showScore ? "Result" : ""}
              </p>
              <p className="text-[10px] font-bold text-white/60">
                {kickoff ? format(kickoff, "HH:mm", { locale: de }) : ""}
              </p>
            </div>
            <TeamLogo team={away} fallback={awayName} color={awayColor} />
          </div>
          <p className="relative z-10 pl-12 line-clamp-2 text-lg font-black leading-tight">
            {awayName}
          </p>
        </div>

        <div className="absolute left-1/2 top-1/2 z-20 flex min-w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl bg-white px-4 py-3 text-black shadow-[0_8px_22px_rgba(0,0,0,0.22)]">
          <StatusBadge game={game} />
          {showScore ? (
            <div className="mt-1 flex items-center gap-2 text-3xl font-black tabular-nums leading-none">
              <span>{game.scoreHome ?? 0}</span>
              <span className="text-black/25">:</span>
              <span>{game.scoreAway ?? 0}</span>
            </div>
          ) : (
            <>
              <span className="text-2xl font-black leading-none text-blue-700">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}</span>
              <span className="mt-1 text-[9px] font-black uppercase text-black/45">
                {kickoff ? format(kickoff, "dd.MM.", { locale: de }) : "Offen"}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function CompactGameRow({ game, teamsById, leaguesById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = status === "final";

  return (
    <Link to={`/game/${game.id}`} className="flex items-center gap-3 rounded-[22px] bg-white p-3 text-black">
      <TeamLogo team={home} fallback={game.homeTeamPlaceholder} color={league?.primaryColor || "#005bff"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">{getTeamName(home, game.homeTeamPlaceholder)}</p>
        <p className="truncate text-[10px] font-bold uppercase text-black/45">
          {league?.shortName || league?.name || "Game"}
        </p>
      </div>
      <div className="text-center">
        {showScore ? (
          <p className="text-lg font-black tabular-nums">{game.scoreHome ?? 0}:{game.scoreAway ?? 0}</p>
        ) : (
          <p className="text-sm font-black text-blue-700">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}</p>
        )}
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-xs font-black">{getTeamName(away, game.awayTeamPlaceholder)}</p>
        <p className="truncate text-[10px] font-bold uppercase text-black/45">
          {kickoff ? format(kickoff, "dd.MM.", { locale: de }) : "Offen"}
        </p>
      </div>
      <TeamLogo team={away} fallback={game.awayTeamPlaceholder} color="#b51222" />
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

function QuickPath({ active, label, count, onClick, color = "blue" }) {
  const activeClass = color === "red" ? "bg-red-700 text-white" : "bg-blue-700 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[22px] p-4 text-left transition-colors ${active ? activeClass : "bg-white text-black"}`}
    >
      <p className={`text-[10px] font-black uppercase ${active ? "text-white/70" : "text-black/45"}`}>
        Öffnen
      </p>
      <p className="mt-1 text-lg font-black leading-none">{label}</p>
      <p className={`mt-2 text-xs font-bold ${active ? "text-white/70" : "text-black/45"}`}>
        {count} Einträge
      </p>
    </button>
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
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="yardline-heading truncate text-[22px] sm:text-2xl">{title}</h2>
        <div className="yardline-title-bars" />
      </div>
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
    { key: "today", label: "Heute" },
    { key: "upcoming", label: "Kommend" },
    { key: "past", label: "Final" },
  ];

  const featuredGames = visibleGames.slice(0, 2);
  const restGames = visibleGames.slice(2);

  return (
    <section>
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-black/10 bg-white p-1">
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
        <div className="space-y-4">
          {featuredGames.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {featuredGames.map((game) => (
                <MatchScoreCard
                  key={game.id}
                  game={game}
                  teamsById={teamsById}
                  leaguesById={leaguesById}
                />
              ))}
            </div>
          )}

          {restGames.length > 0 && (
            <div className="space-y-2">
              {restGames.map((game) => (
                <CompactGameRow
                  key={game.id}
                  game={game}
                  teamsById={teamsById}
                  leaguesById={leaguesById}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function getLeagueCountryGroup(league) {
  const country = String(league?.country || "").toLowerCase();
  if (
    league?.isEuropeanLeague === true ||
    league?.regionType === "international" ||
    country === "europe" ||
    country === "europa" ||
    country === "international"
  ) {
    return "Europa / International";
  }

  return league.country || "Weitere Ligen";
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

function groupLeagues(leagues) {
  const map = new Map();

  leagues.forEach((league) => {
    const group = getLeagueCountryGroup(league);
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(league);
  });

  return Array.from(map.entries())
    .map(([title, items]) => ({ title, items: sortLeagues(items) }))
    .sort((a, b) => {
      if (a.title === "Europa / International") return -1;
      if (b.title === "Europa / International") return 1;
      return a.title.localeCompare(b.title, "de");
    });
}

function LeagueCluster({ title, leagues }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-black/45">{title}</h3>
      <div className="space-y-2">
        {leagues.map((league) => (
          <LeagueRow key={league.id} league={league} />
        ))}
      </div>
    </div>
  );
}

function LeaguesPanel({ leagues }) {
  const groups = useMemo(() => groupLeagues(leagues), [leagues]);

  return (
    <section>
      <SectionHeader title="Ligen & Tabellen" count={leagues.length} />
      {groups.length === 0 ? (
        <EmptyState label="Keine Ligen gefunden." />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <LeagueCluster key={group.title} title={group.title} leagues={group.items} />
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
  const visibleTournamentsCount = useMemo(() => {
    return tournaments
      .filter((item) => item.isPublished !== false)
      .filter((item) => item.isActive !== false || item.status === "completed")
      .length;
  }, [tournaments]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <QuickPath
            active={activeTab === "games"}
            label="Games"
            count={games.length}
            onClick={() => setActiveTab("games")}
            color="red"
          />
          <QuickPath
            active={activeTab === "leagues"}
            label="Ligen"
            count={leagues.length}
            onClick={() => setActiveTab("leagues")}
          />
          <QuickPath
            active={activeTab === "tournaments"}
            label="Cups"
            count={visibleTournamentsCount}
            onClick={() => setActiveTab("tournaments")}
          />
        </div>

        <SearchBox value={search} onChange={setSearch} />

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
