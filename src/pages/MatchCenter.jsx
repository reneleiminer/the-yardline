import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, isBefore, isSameDay, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Search } from "lucide-react";

import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";
import StandingsTable from "@/components/standings/StandingsTable";
const MATCH_TABS = [
  { key: "games", label: "Spiele" },
  { key: "standings", label: "Tabellen" },
];

function normalizeId(value) {
  return String(value || "").trim();
}

function getGameDate(game) {
  if (game?.date) {
    const rawTime = game.time || game.kickoffTime || "00:00";
    const [year, month, day] = String(game.date).split("-").map(Number);
    const [hour, minute] = String(rawTime).split(":").map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0);
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

  const label = status === "final" ? "FINAL" : "ABGESAGT";
  const className = status === "final" ? "bg-black text-white" : "bg-[#c20f1a] text-white";

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
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || "#013369");
  const awayColor = getTeamColor(away, "#c20f1a");
  const status = getEffectiveGameStatus(game);
  const showScore = status === "final";
  const kickoff = getGameDate(game);

  return (
    <Link
      to={`/game/${game.id}`}
      className="block overflow-hidden rounded-[28px] border border-white/10 bg-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.32)] active:scale-[0.99] transition-transform"
    >
      <div className="relative grid min-h-[152px] grid-cols-2 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_18px)] opacity-35" />
        <div className="relative flex flex-col justify-between p-4" style={{ background: homeColor }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-black/22" />
          <div className="relative z-10 flex items-start justify-start">
            <TeamLogo team={home} />
          </div>
          <p className="relative z-10 pr-12 line-clamp-2 text-lg font-black leading-tight">{homeName}</p>
        </div>

        <div className="relative flex flex-col justify-between p-4 text-right" style={{ background: awayColor }}>
          <div className="absolute inset-0 bg-gradient-to-bl from-white/18 via-transparent to-black/22" />
          <div className="relative z-10 flex items-start justify-end">
            <TeamLogo team={away} />
          </div>
          <p className="relative z-10 pl-12 line-clamp-2 text-lg font-black leading-tight">{awayName}</p>
        </div>

        <div className="absolute left-1/2 top-1/2 z-20 flex min-w-[112px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[18px] border border-white/24 bg-black px-4 py-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.62),0_0_0_1px_rgba(194,15,26,0.22)]">
          <StatusBadge game={game} />
          {showScore ? (
            <div className="mt-1 flex items-center gap-2 text-3xl font-black tabular-nums leading-none">
              <span>{game.scoreHome ?? 0}</span>
              <span className="text-white/35">:</span>
              <span>{game.scoreAway ?? 0}</span>
            </div>
          ) : (
            <>
              <span className="text-2xl font-black leading-none text-[#ff2338]">
                {kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}
              </span>
              <span className="mt-1 text-[9px] font-black uppercase text-white/82">
                {kickoff ? format(kickoff, "dd.MM.", { locale: de }) : "Offen"}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function getUpcomingWindow(today) {
  const day = today.getDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  const friday = addDays(today, daysUntilFriday);

  return {
    start: day === 0 || day === 6 ? today : friday,
    end: addDays(friday, 3),
  };
}

function getTeamNextGameDate(teamId, games, now) {
  return games
    .filter((game) => game.status !== "final" && game.status !== "cancelled")
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .map(getGameDate)
    .filter((date) => date && date >= now)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

function selectRelevantGames(games) {
  const now = new Date();
  const today = startOfDay(now);
  const weekend = getUpcomingWindow(today);
  const recentFinalCutoff = subDays(today, 7);
  const teamNextCache = new Map();

  const getNext = (teamId) => {
    if (!teamId) return null;
    if (!teamNextCache.has(teamId)) teamNextCache.set(teamId, getTeamNextGameDate(teamId, games, now));
    return teamNextCache.get(teamId);
  };

  const candidates = games
    .map((game) => ({ game, date: getGameDate(game), status: getEffectiveGameStatus(game) }))
    .filter((item) => {
      if (!item.date) return false;

      const todayGame = isSameDay(item.date, today);
      const weekendGame =
        item.status !== "final" &&
        item.status !== "cancelled" &&
        item.date >= weekend.start &&
        item.date < addDays(weekend.end, 1);

      if (todayGame || weekendGame) return true;

      if (item.status === "final" || item.status === "cancelled") {
        if (isBefore(item.date, recentFinalCutoff)) return false;
        const nextGame = [getNext(item.game.homeTeamId), getNext(item.game.awayTeamId)]
          .filter(Boolean)
          .sort((a, b) => a.getTime() - b.getTime())[0];
        return !nextGame || nextGame > addDays(today, 3);
      }

      return false;
    })
    .sort((a, b) => {
      const finalA = a.status === "final" || a.status === "cancelled" ? 1 : 0;
      const finalB = b.status === "final" || b.status === "cancelled" ? 1 : 0;
      if (finalA !== finalB) return finalA - finalB;
      return a.date.getTime() - b.date.getTime();
    });

  const usedTeams = new Set();
  const selected = [];

  candidates.forEach(({ game }) => {
    if ((game.homeTeamId && usedTeams.has(game.homeTeamId)) || (game.awayTeamId && usedTeams.has(game.awayTeamId))) return;
    selected.push(game);
    if (game.homeTeamId) usedTeams.add(game.homeTeamId);
    if (game.awayTeamId) usedTeams.add(game.awayTeamId);
  });

  return selected;
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

function SectionHeader({ title }) {
  return (
    <div className="mb-3">
      <h2 className="yardline-heading truncate text-[22px] sm:text-2xl">{title}</h2>
    </div>
  );
}

function GamesPanel({ games, teamsById, leaguesById }) {
  const groups = useMemo(
    () => groupByLeague(selectRelevantGames(games), (game) => game.leagueId, leaguesById),
    [games, leaguesById]
  );

  return (
    <section>
      <SectionHeader title="Spiele" />
      {groups.length === 0 ? (
        <EmptyState label="Keine aktuellen oder kommenden Spiele." />
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

    const homeTeam = teamsById[game.homeTeamId];
    const awayTeam = teamsById[game.awayTeamId];

    if (isWithdrawnBeforeSeason(homeTeam) || isWithdrawnBeforeSeason(awayTeam)) return false;
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

function LeagueIconPicker({ leagues, selectedLeagueId, onSelect }) {
  if (leagues.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar">
      <div className="flex gap-2 pb-1">
        {leagues.map((league) => {
          const active = league.id === selectedLeagueId;

          return (
            <button
              key={league.id}
              type="button"
              onClick={() => onSelect(league.id)}
              title={league.name}
              aria-label={league.name}
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border p-2 transition-all ${
                active
                  ? "border-[#ff2338]/70 bg-black shadow-[0_10px_26px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.10)]"
                  : "border-white/12 bg-black/72 active:bg-black"
              }`}
            >
              {league.logo ? (
                <img src={getImageUrl(league.logo)} alt="" className="h-full w-full object-contain" loading="lazy" />
              ) : (
                <span className={`text-sm font-black ${active ? "text-white" : "text-white/55"}`}>
                  {(league.shortName || league.name || "L").slice(0, 2)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StandingsPanel({ leagues, teams, games, standingsConfigs, clubsById, teamsByIdObject, query }) {
  const visibleLeagues = useMemo(() => {
    const filtered = leagues.filter((league) =>
      teams.some((team) => team.leagueId === league.id)
    );

    if (!query) return filtered;

    return filtered.filter((league) =>
      [league.name, league.shortName, league.country, league.regionState, league.stateRegion, league.season, league.tierLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [leagues, query, teams]);

  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const selectedLeague = useMemo(
    () => visibleLeagues.find((league) => league.id === selectedLeagueId) || null,
    [selectedLeagueId, visibleLeagues]
  );

  const groups = useMemo(() => getGroupOptions(selectedLeague, teams), [selectedLeague, teams]);
  const tableGroups = groups.length > 0 ? groups : [{ id: "all", name: "Gesamttabelle" }];
  const leagueConfigs = useMemo(
    () => standingsConfigs.filter((config) => config.leagueId === selectedLeague?.id),
    [selectedLeague?.id, standingsConfigs]
  );

  return (
    <section>
      <SectionHeader title="Tabellen" />

      {visibleLeagues.length === 0 ? (
        <EmptyState label="Keine Ligen gefunden." />
      ) : (
        <div className="space-y-4">
          <LeagueIconPicker
            leagues={visibleLeagues}
            selectedLeagueId={selectedLeague?.id}
            onSelect={setSelectedLeagueId}
          />

          {selectedLeague && (
            <div className="rounded-[24px] border border-white/10 bg-black/82 p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-black p-2">
                  {selectedLeague.logo ? (
                    <img src={getImageUrl(selectedLeague.logo)} alt="" className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <span className="text-sm font-black text-white">
                      {(selectedLeague.shortName || selectedLeague.name || "L").slice(0, 2)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-white">{selectedLeague.name}</h3>
                  <p className="truncate text-[11px] font-bold text-white/52">
                    {[selectedLeague.country, selectedLeague.regionState || selectedLeague.stateRegion, selectedLeague.season].filter(Boolean).join(" - ") || "Tabelle"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {tableGroups.map((group) => {
                  const rows = computeStandings({
                    league: selectedLeague,
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
          )}
        </div>
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
