import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, Search } from "lucide-react";

import { useGlobalData } from "@/lib/GlobalDataContext";
import { getEffectiveGameStatus, getGameDate } from "@/lib/gameStatusUtils";
import { getImageUrl } from "@/lib/imageUtils";
import StandingsTable from "@/components/standings/StandingsTable";
import ScoreDisplay from "@/components/ui/ScoreDisplay";
const MATCH_TABS = [
  { key: "games", label: "Games" },
  { key: "standings", label: "Standings" },
];

const GAME_FILTER_TABS = [
  { key: "previous", label: "Previous" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
];

function normalizeId(value) {
  return String(value || "").trim();
}

function toRgba(color, alpha) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  const value = String(color).trim();

  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map(char => char + char).join("");
    }

    if (hex.length === 6) {
      const parsed = Number.parseInt(hex, 16);
      if (Number.isFinite(parsed)) {
        const r = (parsed >> 16) & 255;
        const g = (parsed >> 8) & 255;
        const b = parsed & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (value.startsWith("rgb(")) {
    return value.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  return value;
}

function getTeamName(team, fallback) {
  return team?.name || team?.shortName || fallback || "Offen";
}


function hasPlayableScore(game) {
  return (
    game?.scoreHome !== undefined &&
    game?.scoreAway !== undefined &&
    game?.scoreHome !== null &&
    game?.scoreAway !== null &&
    game?.scoreHome !== "" &&
    game?.scoreAway !== "" &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function TeamLogo({ team, className = "h-20 w-20" }) {
  if (!team?.logo) return null;

  return (
    <img
      src={getImageUrl(team.logo)}
      alt={team.name || ""}
      className={`${className} object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]`}
      loading="lazy"
    />
  );
}

function StatusBadge({ game }) {
  const status = getEffectiveGameStatus(game);
  if (status === "scheduled") return null;

  const label = status === "live" ? "LIVE" : status === "final" ? "FINAL" : "ABGESAGT";
  const className = status === "live"
    ? "bg-[#c20f1a] text-white animate-pulse"
    : status === "final"
      ? "bg-black text-white"
      : "bg-orange-600 text-white";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black tracking-wide ${className}`}>
      {label}
    </span>
  );
}

function MatchScoreCard({ game, teamsById, leaguesById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = (status === "final" || status === "live") && hasPlayableScore(game);
  const homeColor = getTeamColor(home, league?.primaryColor || "#013369");
  const awayColor = getTeamColor(away, "#c20f1a");
  const statusLabel = status === "live" ? "LIVE" : status === "final" ? "FINAL" : status === "cancelled" ? "ABGESAGT" : "KICKOFF";

  const centerBlock = showScore ? (
    <>
      <ScoreDisplay
        homeScore={game.scoreHome ?? 0}
        awayScore={game.scoreAway ?? 0}
        dark
        size="md"
      />
      <span className={`mt-1 text-[8px] font-black uppercase tracking-[0.2em] sm:mt-2 sm:text-[10px] sm:tracking-[0.22em] ${status === "live" ? "text-[#ff2338]" : "text-white/78"}`}>
        {status === "live" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ff2338] align-middle shadow-[0_0_10px_rgba(255,35,56,0.9)]" />}
        {statusLabel}
      </span>
    </>
  ) : status === "cancelled" ? (
    <>
      <span className="text-[16px] font-black uppercase tracking-[0.16em] text-white/82 sm:text-[18px] sm:tracking-[0.18em]">VS</span>
      <span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-orange-200 sm:mt-2 sm:text-[10px] sm:tracking-[0.22em]">ABGESAGT</span>
    </>
  ) : (
    <>
      <span className="text-[24px] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.38)] sm:text-[42px]">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "--:--"}</span>
      <span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/78 sm:mt-2 sm:text-[10px] sm:tracking-[0.22em]">{kickoff ? format(kickoff, "dd.MM.", { locale: de }) : statusLabel}</span>
    </>
  );

  return (
    <Link to={`/game/${game.id}`} className="group block overflow-hidden rounded-[22px] border border-white/10 bg-black text-white shadow-[0_18px_44px_rgba(0,0,0,0.34)] transition-transform active:scale-[0.99] sm:rounded-[28px]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 grid grid-cols-2">
          <div style={{ background: homeColor }} />
          <div style={{ background: awayColor }} />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white/12 via-transparent to-black/12" />
        <div className="pointer-events-none absolute inset-y-4 left-1/2 z-10 w-px -translate-x-1/2 bg-white/18 sm:inset-y-5" />

        <div className="relative z-20 flex min-h-[128px] flex-col justify-center gap-2 px-3 py-3 sm:min-h-[218px] sm:gap-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
            <div className="flex min-w-0 justify-center">
              <TeamLogo team={home} className="h-[58px] w-[60px] shrink-0 object-contain opacity-95 drop-shadow-[0_8px_18px_rgba(0,0,0,0.38)] sm:h-[124px] sm:w-[122px]" />
            </div>

            <div className="flex min-w-[92px] flex-col items-center justify-center rounded-[18px] border border-white/10 bg-black/78 px-3 py-2 text-center shadow-[0_12px_28px_rgba(0,0,0,0.42)] backdrop-blur sm:min-w-[148px] sm:rounded-[24px] sm:px-4 sm:py-3">
              {centerBlock}
            </div>

            <div className="flex min-w-0 justify-center">
              <TeamLogo team={away} className="h-[58px] w-[60px] shrink-0 object-contain opacity-95 drop-shadow-[0_8px_18px_rgba(0,0,0,0.38)] sm:h-[124px] sm:w-[122px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <p className="line-clamp-2 hyphens-auto whitespace-normal break-words text-center text-[14px] font-black italic leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:text-[28px] sm:leading-[1.06]">
              {homeName}
            </p>
            <p className="line-clamp-2 hyphens-auto whitespace-normal break-words text-center text-[14px] font-black italic leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:text-[28px] sm:leading-[1.06]">
              {awayName}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
function isGameToday(date, today) {
  return date >= today && date < addDays(today, 1);
}

function isGameUpcoming(date, today) {
  return date >= addDays(today, 1) && date < addDays(today, 8);
}

function isGamePrevious(date, today) {
  return date < today && date >= addDays(today, -7);
}

function selectRelevantGames(games, mode = "today") {
  const today = startOfDay(new Date());

  return games
    .map((game) => ({
      game,
      date: getGameDate(game),
      status: getEffectiveGameStatus(game),
    }))
    .filter((item) => {
      if (!item.date) return false;
      if (item.status === "cancelled") return false;

      if (mode === "upcoming") {
        return isGameUpcoming(item.date, today);
      }

      if (mode === "previous") {
        return isGamePrevious(item.date, today) || item.status === "final";
      }

      return isGameToday(item.date, today);
    })
    .sort((a, b) => {
      const liveA = a.game.status === "live" ? 0 : 1;
      const liveB = b.game.status === "live" ? 0 : 1;
      if (liveA !== liveB) return liveA - liveB;

      const finalA = a.status === "final" ? 1 : 0;
      const finalB = b.status === "final" ? 1 : 0;
      if (finalA !== finalB) return finalA - finalB;

      if (mode === "previous") {
        return b.date.getTime() - a.date.getTime();
      }

      return a.date.getTime() - b.date.getTime();
    })
    .map((item) => item.game);
}

function groupByLeague(items, getLeagueId, leaguesById) {
  const map = new Map();

  items.forEach((item) => {
    const leagueId = getLeagueId(item) || "unknown";
    const league = leaguesById.get(leagueId);

    if (!map.has(leagueId)) {
      map.set(leagueId, {
        key: leagueId,
        league,
        title: league?.shortName || league?.name || "Ohne Liga",
        items: [],
      });
    }

    map.get(leagueId).items.push(item);
  });

  return Array.from(map.values()).sort((a, b) => {
    const orderA = Number(a.league?.sortOrder ?? a.league?.level ?? 999);
    const orderB = Number(b.league?.sortOrder ?? b.league?.level ?? 999);
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title, "de");
  });
}

function LeagueTitle({ group }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      {group.league?.logo && (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-black/78 p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.28)]">
          <img src={getImageUrl(group.league.logo)} alt="" className="h-full w-full object-contain" loading="lazy" />
        </span>
      )}
      <h3 className="truncate text-base font-black uppercase italic tracking-normal text-white sm:text-lg">
        {group.title}
      </h3>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="yardline-heading text-[22px] sm:text-2xl">{title}</h2>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}

function GameDateSwitch({ value, onChange }) {
  return (
    <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-white/12 bg-black/72 p-1 shadow-[0_14px_34px_rgba(0,0,0,0.28)] sm:w-auto sm:min-w-[320px]">
      {GAME_FILTER_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`h-11 min-w-0 rounded-xl px-2 text-[11px] font-black uppercase tracking-wide transition-colors ${
            value === tab.key
              ? "bg-[#c20f1a] text-white shadow-[0_8px_20px_rgba(194,15,26,0.28)]"
              : "text-white/60 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function GamesPanel({ games, teamsById, leaguesById }) {
  const [gameFilter, setGameFilter] = useState("today");

  const selectedGames = useMemo(
    () => selectRelevantGames(games, gameFilter),
    [gameFilter, games]
  );

  const groups = useMemo(
    () => groupByLeague(selectedGames, (game) => game.leagueId, leaguesById),
    [leaguesById, selectedGames]
  );

  const emptyLabel =
    gameFilter === "today"
      ? "Heute stehen keine Spiele an."
      : "Keine kommenden Spiele in den nächsten 7 Tagen.";

  return (
    <section>
      <SectionHeader
        title="Games"
        action={<GameDateSwitch value={gameFilter} onChange={setGameFilter} />}
      />
      {groups.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <LeagueTitle group={group} />
              <div className="space-y-3">
                {group.items.map((game) => (
                  <MatchScoreCard key={game.id} game={game} teamsById={teamsById} leaguesById={leaguesById} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function sameSeason(game, season) {
  if (!season) return true;
  return !game.season || game.season === season;
}

function isWithdrawn(team) {
  return team?.withdrawn === true;
}

function isWithdrawnBeforeSeason(team) {
  return team?.withdrawn === true && team?.withdrawnBeforeSeason === true;
}

function createZeroWithdrawnRow(team) {
  return {
    teamId: team.id,
    groupId: team.groupId || "",
    w: 0,
    l: 0,
    t: 0,
    pf: 0,
    pa: 0,
    played: 0,
    withdrawn: true,
    withdrawnBeforeSeason: true,
  };
}

function computeStandings({ league, games = [], teams = [], groupId = "all" }) {
  if (!league?.id) return [];

  const resolvedGroupId = normalizeId(groupId);
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const leagueTeams = teams.filter((team) => {
    if (team.leagueId !== league.id) return false;
    if (resolvedGroupId !== "all" && normalizeId(team.groupId) !== resolvedGroupId) return false;
    return true;
  });

  const stats = {};

  leagueTeams.forEach((team) => {
    stats[team.id] = {
      teamId: team.id,
      groupId: team.groupId || "",
      w: 0,
      l: 0,
      t: 0,
      pf: 0,
      pa: 0,
      played: 0,
      withdrawn: isWithdrawn(team),
      withdrawnBeforeSeason: isWithdrawnBeforeSeason(team),
    };
  });

  const relevantGames = games.filter((game) => {
    if (game.status !== "final") return false;
    if (game.leagueId !== league.id) return false;
    if (!sameSeason(game, league.season)) return false;
    if (game.isCompetitionGame || game.competitionId || game.tournamentId) return false;

    return Boolean(stats[game.homeTeamId] || stats[game.awayTeamId]);
  });

  relevantGames.forEach((game) => {
    const home = stats[game.homeTeamId];
    const away = stats[game.awayTeamId];
    const homeScore = Number(game.scoreHome || 0);
    const awayScore = Number(game.scoreAway || 0);

    if (home && home.withdrawnBeforeSeason !== true) {
      home.played += 1;
      home.pf += homeScore;
      home.pa += awayScore;
      if (homeScore > awayScore) home.w += 1;
      else if (homeScore < awayScore) home.l += 1;
      else home.t += 1;
    }

    if (away && away.withdrawnBeforeSeason !== true) {
      away.played += 1;
      away.pf += awayScore;
      away.pa += homeScore;
      if (awayScore > homeScore) away.w += 1;
      else if (awayScore < homeScore) away.l += 1;
      else away.t += 1;
    }
  });

  leagueTeams.forEach((team) => {
    if (isWithdrawnBeforeSeason(team)) stats[team.id] = createZeroWithdrawnRow(team);
  });

  const getWinPct = (row) => {
    if (!row.played) return 0;
    return (row.w + row.t * 0.5) / row.played;
  };
  const getPointDiff = (row) => row.pf - row.pa;

  const activeRows = Object.values(stats).filter((row) => row.withdrawn !== true);
  const withdrawnRows = Object.values(stats).filter((row) => row.withdrawn === true);

  const sortedActiveRows = [...activeRows].sort((a, b) => {
    const pct = getWinPct(b) - getWinPct(a);
    if (pct !== 0) return pct;
    const diff = getPointDiff(b) - getPointDiff(a);
    if (diff !== 0) return diff;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return (teamsById[a.teamId]?.name || "").localeCompare(teamsById[b.teamId]?.name || "", "de");
  });

  const sortedWithdrawnRows = [...withdrawnRows].sort((a, b) =>
    (teamsById[a.teamId]?.name || "").localeCompare(teamsById[b.teamId]?.name || "", "de")
  );

  return [...sortedActiveRows, ...sortedWithdrawnRows];
}

function getGroupOptions(league, teams = []) {
  const configuredGroups = Array.isArray(league?.groups) ? league.groups : [];
  const groups = configuredGroups
    .map((group) => ({
      id: normalizeId(group.id || group.shortName || group.name),
      name: group.name || group.shortName || group.id,
      displayOrder: Number(group.displayOrder || 0),
    }))
    .filter((group) => group.id);

  if (groups.length > 0) return groups.sort((a, b) => a.displayOrder - b.displayOrder);

  const teamGroups = new Map();
  teams
    .filter((team) => team.leagueId === league?.id && normalizeId(team.groupId))
    .forEach((team) => {
      const id = normalizeId(team.groupId);
      if (!teamGroups.has(id)) {
        teamGroups.set(id, {
          id,
          name: team.groupName || team.group || team.division || team.conference || id,
          displayOrder: 0,
        });
      }
    });

  return Array.from(teamGroups.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

function getZonesForGroup({ standingsConfigs = [], groupId }) {
  const key = groupId || "all";
  const config = standingsConfigs.find((item) => normalizeId(item.groupId || "all") === normalizeId(key));
  return config?.zones || [];
}

function getLeagueRegionLabel(league) {
  const raw = [
    league?.country,
    league?.regionState,
    league?.stateRegion,
    league?.tierLabel,
    league?.name,
    league?.shortName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    raw.includes("europe") ||
    raw.includes("europa") ||
    raw.includes("efa") ||
    raw.includes("afle") ||
    raw.includes("elf")
  ) {
    return "Europa";
  }

  if (
    raw.includes("austria") ||
    raw.includes("österreich") ||
    raw.includes("osterreich") ||
    raw.includes("afl")
  ) {
    return "Österreich";
  }

  if (raw.includes("italy") || raw.includes("italien") || raw.includes("italia")) {
    return "Italien";
  }

  if (raw.includes("france") || raw.includes("frankreich") || raw.includes("français") || raw.includes("francais")) {
    return "Frankreich";
  }

  if (raw.includes("germany") || raw.includes("deutschland") || raw.includes("gfl") || raw.includes("regional")) {
    return "Deutschland";
  }

  return league?.country || "Weitere";
}

function getLeagueRegionOrder(label) {
  const order = {
    Europa: 0,
    Deutschland: 1,
    Österreich: 2,
    Italien: 3,
    Frankreich: 4,
    Weitere: 99,
  };

  return order[label] ?? 90;
}

function groupLeaguesByRegion(leagues) {
  const groups = new Map();

  leagues.forEach((league) => {
    const label = getLeagueRegionLabel(league);

    if (!groups.has(label)) {
      groups.set(label, {
        label,
        leagues: [],
      });
    }

    groups.get(label).leagues.push(league);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      leagues: [...group.leagues].sort((a, b) => {
        const orderA = Number(a.sortOrder ?? a.level ?? 999);
        const orderB = Number(b.sortOrder ?? b.level ?? 999);
        if (orderA !== orderB) return orderA - orderB;

        return String(a.shortName || a.name || "").localeCompare(String(b.shortName || b.name || ""), "de");
      }),
    }))
    .sort((a, b) => {
      const regionA = getLeagueRegionOrder(a.label);
      const regionB = getLeagueRegionOrder(b.label);
      if (regionA !== regionB) return regionA - regionB;

      return a.label.localeCompare(b.label, "de");
    });
}

function LeagueIconPicker({ leagues, selectedLeagueId, onSelect }) {
  const groupedLeagues = useMemo(() => groupLeaguesByRegion(leagues), [leagues]);

  if (leagues.length === 0) return null;

  return (
    <div className="space-y-5">
      {groupedLeagues.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
            {group.label}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {group.leagues.map((league) => {
              const active = league.id === selectedLeagueId;

              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => onSelect(league.id)}
                  title={league.name}
                  aria-label={league.name}
                  className={`relative flex aspect-square min-h-[92px] flex-col items-center justify-center overflow-hidden rounded-[24px] border p-3 text-center transition-all ${
                    active
                      ? "border-[#ff2338]/80 bg-black shadow-[0_14px_34px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.12)]"
                      : "border-white/12 bg-black/72 active:bg-black"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 ${
                      active
                        ? "bg-[radial-gradient(circle_at_50%_0%,rgba(255,35,56,0.22),transparent_55%)]"
                        : "bg-[radial-gradient(circle_at_50%_0%,rgba(47,125,255,0.12),transparent_55%)]"
                    }`}
                  />

                  <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_10px_22px_rgba(0,0,0,0.28)]">
                    {league.logo ? (
                      <img
                        src={getImageUrl(league.logo)}
                        alt=""
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm font-black text-black">
                        {(league.shortName || league.name || "L").slice(0, 2)}
                      </span>
                    )}
                  </span>

                  <span className={`relative mt-2 text-[10px] font-black uppercase leading-tight ${
                    active ? "text-white" : "text-white/68"
                  }`}>
                    {league.shortName || league.name || "Liga"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


function LeagueStandingsDetail({
  league,
  teams,
  games,
  standingsConfigs,
  clubsById,
  teamsByIdObject,
  onBack,
}) {
  const groups = useMemo(() => getGroupOptions(league, teams), [league, teams]);
  const tableGroups = groups.length > 0 ? groups : [{ id: "all", name: "Overall Standings" }];

  const leagueConfigs = useMemo(
    () => standingsConfigs.filter((config) => config.leagueId === league?.id),
    [league?.id, standingsConfigs]
  );

  if (!league) return null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/72 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/66 transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Alle Ligen
      </button>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/82 text-white shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
        <div className="relative p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(194,15,26,0.18),transparent_38%),radial-gradient(circle_at_92%_0%,rgba(47,125,255,0.16),transparent_38%)]" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl border border-white/12 bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.32)]">
              {league.logo ? (
                <img src={getImageUrl(league.logo)} alt="" className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <span className="text-base font-black text-black">
                  {(league.shortName || league.name || "L").slice(0, 2)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2338]">
                Standings
              </p>
              <h3 className="mt-1 truncate text-xl font-black italic leading-tight text-white">
                {league.name || league.shortName || "Liga"}
              </h3>
              <p className="mt-1 truncate text-[11px] font-bold text-white/52">
                {[league.country, league.regionState || league.stateRegion, league.season]
                  .filter(Boolean)
                  .join(" · ") || "League Table"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/10 p-3">
          {tableGroups.map((group) => {
            const rows = computeStandings({
              league,
              games,
              teams,
              groupId: group.id,
            });
            const zones = getZonesForGroup({ standingsConfigs: leagueConfigs, groupId: group.id });

            return (
              <div key={group.id}>
                {tableGroups.length > 1 && (
                  <h4 className="mb-2 rounded-t-[18px] border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/82">
                    {group.name}
                  </h4>
                )}

                {rows.length === 0 ? (
                  <EmptyState label="Keine Tabellen-Daten vorhanden." />
                ) : (
                  <StandingsTable
                    rows={rows}
                    teamsById={teamsByIdObject}
                    zones={zones}
                    clubsById={clubsById}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StandingsPanel({ leagues, teams, games, standingsConfigs, clubsById, teamsByIdObject, query }) {
  const [selectedLeagueId, setSelectedLeagueId] = useState("");

  const visibleLeagues = useMemo(() => {
    const filtered = leagues.filter((league) =>
      teams.some((team) => team.leagueId === league.id)
    );

    if (!query || selectedLeagueId) return filtered;

    return filtered.filter((league) =>
      [league.name, league.shortName, league.country, league.regionState, league.stateRegion, league.season, league.tierLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [leagues, query, selectedLeagueId, teams]);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) || null,
    [leagues, selectedLeagueId]
  );

  return (
    <section>
      <SectionHeader title="Standings" />

      {selectedLeague ? (
        <LeagueStandingsDetail
          league={selectedLeague}
          teams={teams}
          games={games}
          standingsConfigs={standingsConfigs}
          clubsById={clubsById}
          teamsByIdObject={teamsByIdObject}
          onBack={() => setSelectedLeagueId("")}
        />
      ) : visibleLeagues.length === 0 ? (
        <EmptyState label="Keine Ligen gefunden." />
      ) : (
        <LeagueIconPicker
          leagues={visibleLeagues}
          selectedLeagueId={selectedLeagueId}
          onSelect={setSelectedLeagueId}
        />
      )}
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <p className="py-8 text-center text-lg font-black uppercase italic text-white">{label}</p>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/48" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Team, Liga oder Spiel suchen"
        className="h-12 w-full rounded-2xl border border-white/12 bg-black/72 pl-10 pr-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#2f7dff]"
      />
    </div>
  );
}

function TabSwitch({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl border border-white/12 bg-black/72 p-1 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
      {MATCH_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`h-11 rounded-xl text-xs font-black uppercase tracking-wide transition-colors ${
            value === tab.key ? "bg-[#013369] text-white" : "text-white/54 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function MatchCenter() {
  const { games, teams, leagues, gamesLoading, leaguesLoading, standingsConfigs, clubsById } = useGlobalData();
  const [activeTab, setActiveTab] = useState("games");
  const [search, setSearch] = useState("");

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const teamsByIdObject = useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const query = search.trim().toLowerCase();

  const filteredGames = useMemo(() => {
    if (!query) return games;
    return games.filter((game) => {
      const home = teamsById.get(game.homeTeamId);
      const away = teamsById.get(game.awayTeamId);
      const league = leaguesById.get(game.leagueId);
      return [home?.name, home?.shortName, away?.name, away?.shortName, league?.name, league?.shortName, game.homeTeamPlaceholder, game.awayTeamPlaceholder]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [games, leaguesById, query, teamsById]);

  const isLoading = gamesLoading || leaguesLoading;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="space-y-4">
        <TabSwitch value={activeTab} onChange={setActiveTab} />
        <SearchBox value={search} onChange={setSearch} />

        {isLoading ? null : (
          <>
            {activeTab === "games" && <GamesPanel games={filteredGames} teamsById={teamsById} leaguesById={leaguesById} />}
            {activeTab === "standings" && (
              <StandingsPanel
                leagues={leagues}
                teams={teams}
                games={games}
                standingsConfigs={standingsConfigs}
                clubsById={clubsById}
                teamsByIdObject={teamsByIdObject}
                query={query}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
