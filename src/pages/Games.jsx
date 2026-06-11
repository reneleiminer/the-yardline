import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Loader2,
  Radio,
  Trophy,
} from "lucide-react";

import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";

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

  const date = getGameDate(game);
  if (!date) return game.status || "scheduled";

  // UI-Fallback: Wenn die Function verzögert läuft, zeigt die App trotzdem Live an.
  // Abgesagte Spiele bleiben aber immer abgesagt und dürfen nie automatisch Live werden.
  if ((game.status || "scheduled") === "scheduled" && new Date().getTime() >= date.getTime()) {
    return "live";
  }

  return game.status || "scheduled";
}

function hasStream(game) {
  const status = getEffectiveGameStatus(game);
  if (status === "cancelled" || status === "final") return false;
  if (game.streamEnabled === false) return false;
  if (game.streamUrl) return true;

  return Array.isArray(game.streamLinks)
    ? game.streamLinks.some((link) => link?.url && link?.enabled !== false && link?.status !== "rejected")
    : false;
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || "Offen";
}

function getTeamColor(team, fallback = "#2563eb") {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function TeamLogo({ team, fallback }) {
  if (team?.logo) {
    return (
      <div className="w-12 h-12 rounded-xl bg-black/25 border border-white/10 flex items-center justify-center p-1.5">
        <img
          src={getImageUrl(team.logo)}
          alt={team.name || ""}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-secondary border border-white/10 flex items-center justify-center text-xs font-black">
      {team?.shortName?.[0] || team?.name?.[0] || fallback?.[0] || "?"}
    </div>
  );
}

function StatusBadge({ game }) {
  const status = getEffectiveGameStatus(game);

  if (status === "cancelled") {
    return (
      <span className="text-[9px] font-black text-orange-300 bg-orange-500/15 border border-orange-500/30 rounded-full px-2 py-0.5">
        ABGESAGT
      </span>
    );
  }

  if (status === "live") {
    return (
      <span className="text-[9px] font-black text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
        LIVE
      </span>
    );
  }

  if (status === "final") {
    return (
      <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5">
        FINAL
      </span>
    );
  }

  return null;
}

function GameCard({ game, teamsById, leaguesById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || "#2563eb");
  const awayColor = getTeamColor(away, "#ef4444");

  const effectiveStatus = getEffectiveGameStatus(game);
  const isCancelled = effectiveStatus === "cancelled";
  const showScore = effectiveStatus === "final" || effectiveStatus === "live";

  return (
    <Link
      to={`/game/${game.id}`}
      className={`relative block rounded-2xl border overflow-hidden active:scale-[0.99] transition-transform ${
        isCancelled
          ? "border-orange-500/30 bg-orange-500/5"
          : "border-border/50 bg-card"
      }`}
      style={{
        boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
      }}
    >
      <div className="px-3 pt-3 pb-3">
        <div className="relative mb-2 min-h-5">
          <p className="text-[10px] font-semibold text-muted-foreground truncate pr-16">
            {getGameDate(game)
              ? format(getGameDate(game), "HH:mm", { locale: de })
              : game.time || game.kickoffTime || "Uhrzeit offen"}
          </p>

          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <StatusBadge game={game} />
          </div>

          <div className="absolute right-0 top-0 flex items-center gap-2">
            {hasStream(game) && <Radio className="w-[18px] h-[18px] text-primary" />}
            {(game.isCompetitionGame || game.competitionId || game.tournamentId) && (
              <Trophy className="w-4 h-4 text-yellow-400" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center min-w-0">
            <TeamLogo team={home} fallback={homeName} />

            <p className="mt-2 text-[11px] font-black text-center leading-tight whitespace-normal break-words line-clamp-2">
              {homeName}
            </p>
          </div>

          <div className="flex justify-center min-w-0">
            {isCancelled ? (
              <span className="inline-flex rounded-xl bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300">
                Abgesagt
              </span>
            ) : showScore ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black leading-none tabular-nums whitespace-nowrap">
                  {game.scoreHome ?? 0}
                </span>

                <span className="text-lg font-black text-muted-foreground">
                  :
                </span>

                <span className="text-2xl font-black leading-none tabular-nums whitespace-nowrap">
                  {game.scoreAway ?? 0}
                </span>
              </div>
            ) : (
              <span className="inline-flex rounded-xl bg-secondary/70 border border-border/50 px-4 py-1.5 text-xs font-black">
                VS
              </span>
            )}
          </div>

          <div className="flex flex-col items-center min-w-0">
            <TeamLogo team={away} fallback={awayName} />

            <p className="mt-2 text-[11px] font-black text-center leading-tight whitespace-normal break-words line-clamp-2">
              {awayName}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CompactEmptyState() {
  return (
    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
      Keine Spiele gefunden.
    </div>
  );
}

function ModeSwitch({ value, onChange }) {
  const items = [
    { key: "past", label: "Vergangen" },
    { key: "today", label: "Heute" },
    { key: "upcoming", label: "Kommend" },
  ];

  return (
    <div className="px-4 pt-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card border border-border/50 p-1">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`h-9 rounded-xl text-xs font-black transition-colors ${
              value === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function groupGamesByDay(games, mode, leaguesById) {
  const dayMap = new Map();

  games.forEach(game => {
    const date = getGameDate(game);
    const dayKey = date ? format(date, "yyyy-MM-dd") : "offen";
    const league = leaguesById.get(game.leagueId);
    const leagueKey = game.leagueId || "unknown";

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        key: dayKey,
        date,
        title: date
          ? format(date, "EEEE, dd. MMMM", { locale: de })
          : "Termin offen",
        leagues: new Map(),
      });
    }

    const dayGroup = dayMap.get(dayKey);

    if (!dayGroup.leagues.has(leagueKey)) {
      dayGroup.leagues.set(leagueKey, {
        key: leagueKey,
        league,
        title: league?.shortName || league?.name || "Keine Liga",
        games: [],
      });
    }

    dayGroup.leagues.get(leagueKey).games.push(game);
  });

  return Array.from(dayMap.values())
    .map(day => ({
      ...day,
      leagues: Array.from(day.leagues.values()).sort((a, b) => {
        const sortA = Number(a.league?.sortOrder ?? a.league?.level ?? 999);
        const sortB = Number(b.league?.sortOrder ?? b.league?.level ?? 999);

        if (sortA !== sortB) return sortA - sortB;

        return a.title.localeCompare(b.title);
      }),
    }))
    .sort((a, b) => {
      if (a.key === "offen") return 1;
      if (b.key === "offen") return -1;

      const timeA = a.date?.getTime() || 0;
      const timeB = b.date?.getTime() || 0;

      return mode === "past" ? timeB - timeA : timeA - timeB;
    });
}

export default function Games() {
  const [mode, setMode] = useState("today");
  const autoSwitchedRef = useRef(false);
  const userChangedModeRef = useRef(false);

  const { games, teams, leagues, gamesLoading } = useGlobalData();

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const yesterday = useMemo(() => subDays(today, 1), [today]);

  const sevenDaysAgo = useMemo(() => subDays(today, 7), [today]);
  const sevenDaysAhead = useMemo(() => addDays(today, 7), [today]);

  const todayGamesCount = useMemo(() => {
    return games.filter(game => {
      const date = getGameDate(game);
      return date && isSameDay(date, today);
    }).length;
  }, [games, today]);

  const upcomingGamesCount = useMemo(() => {
    return games.filter(game => {
      const date = getGameDate(game);
      if (!date) return false;

      return (
        getEffectiveGameStatus(game) !== "final" &&
        !isBefore(date, tomorrow) &&
        isBefore(date, addDays(sevenDaysAhead, 1))
      );
    }).length;
  }, [games, sevenDaysAhead, tomorrow]);

  useEffect(() => {
    if (gamesLoading) return;
    if (autoSwitchedRef.current) return;
    if (userChangedModeRef.current) return;
    if (mode !== "today") return;
    if (todayGamesCount > 0) return;
    if (upcomingGamesCount === 0) return;

    autoSwitchedRef.current = true;
    setMode("upcoming");
  }, [gamesLoading, mode, todayGamesCount, upcomingGamesCount]);

  const handleModeChange = nextMode => {
    userChangedModeRef.current = true;
    setMode(nextMode);
  };

  const visibleGames = useMemo(() => {
    return games
      .filter(game => {
        const date = getGameDate(game);
        if (!date) return false;

        if (mode === "past") {
          const status = getEffectiveGameStatus(game);

          return (
            (status === "final" || status === "cancelled") &&
            !isBefore(date, sevenDaysAgo) &&
            isBefore(date, today)
          );
        }

        if (mode === "today") {
          return isSameDay(date, today);
        }

        return (
          getEffectiveGameStatus(game) !== "final" &&
          !isBefore(date, tomorrow) &&
          isBefore(date, addDays(sevenDaysAhead, 1))
        );
      })
      .sort((a, b) => {
        const dateA = getGameDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
        const dateB = getGameDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;

        return mode === "past" ? dateB - dateA : dateA - dateB;
      });
  }, [games, mode, sevenDaysAgo, sevenDaysAhead, today, tomorrow]);

  const groupedGames = useMemo(
    () => groupGamesByDay(visibleGames, mode, leaguesById),
    [mode, visibleGames, leaguesById]
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      <ModeSwitch value={mode} onChange={handleModeChange} />

      {gamesLoading && groupedGames.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : groupedGames.length === 0 ? (
        <CompactEmptyState />
      ) : (
        <div className="px-4 pt-5 space-y-6 pb-12">
          {groupedGames.map(dayGroup => (
            <section key={dayGroup.key}>
              <h2 className="text-sm font-black capitalize truncate mb-3">
                {dayGroup.title}
              </h2>

              <div className="space-y-4">
                {dayGroup.leagues.map(leagueGroup => (
                  <div key={leagueGroup.key}>
                    <div className="flex items-center gap-2 mb-2">
                      {leagueGroup.league?.logo && (
                        <img
                          src={getImageUrl(leagueGroup.league.logo)}
                          alt={leagueGroup.title}
                          className="w-5 h-5 object-contain rounded"
                          loading="lazy"
                        />
                      )}

                      <h3 className="text-xs font-black text-primary uppercase tracking-wide truncate">
                        {leagueGroup.title}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {leagueGroup.games.map(game => (
                        <GameCard
                          key={game.id}
                          game={game}
                          teamsById={teamsById}
                          leaguesById={leaguesById}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
