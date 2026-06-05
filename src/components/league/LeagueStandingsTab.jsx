import React, { useMemo, useState } from 'react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import StandingsTable from '@/components/standings/StandingsTable';
import { useLeagueTheme } from '@/lib/useLeagueTheme';
import { Loader2 } from 'lucide-react';

function sameSeason(game, season) {
  if (!season) return true;
  return !game.season || game.season === season;
}

function normalizeId(value) {
  return String(value || '').trim();
}

function computeStandings({ league, games = [], teams = [], groupId = 'all' }) {
  if (!league?.id) return [];

  const resolvedGroupId = normalizeId(groupId);

  const leagueTeams = teams.filter(team => {
    if (team.leagueId !== league.id) return false;
    if (resolvedGroupId !== 'all' && normalizeId(team.groupId) !== resolvedGroupId) return false;
    return true;
  });

  const stats = {};
  const teamsById = Object.fromEntries(teams.map(team => [team.id, team]));

  leagueTeams.forEach(team => {
    stats[team.id] = {
      teamId: team.id,
      groupId: team.groupId || '',
      w: 0,
      l: 0,
      t: 0,
      pf: 0,
      pa: 0,
      played: 0,
    };
  });

  const relevantGames = games.filter(game => {
    if (game.status !== 'final') return false;
    if (game.leagueId !== league.id) return false;
    if (!sameSeason(game, league.season)) return false;
    if (game.isCompetitionGame || game.competitionId || game.tournamentId) return false;

    const homeIsInCurrentTable = Boolean(stats[game.homeTeamId]);
    const awayIsInCurrentTable = Boolean(stats[game.awayTeamId]);

    // Für diese Tabelle zählt ein finales Ligaspiel, sobald mindestens eines
    // der beiden Teams in der aktuell angezeigten Tabelle enthalten ist.
    // So gehen Spiele nicht verloren, wenn beim Gegner Daten wie groupId fehlen.
    if (!homeIsInCurrentTable && !awayIsInCurrentTable) return false;

    return true;
  });

  relevantGames.forEach(game => {
    const home = stats[game.homeTeamId];
    const away = stats[game.awayTeamId];

    const homeScore = Number(game.scoreHome || 0);
    const awayScore = Number(game.scoreAway || 0);

    if (home) {
      home.played += 1;
      home.pf += homeScore;
      home.pa += awayScore;

      if (homeScore > awayScore) {
        home.w += 1;
      } else if (homeScore < awayScore) {
        home.l += 1;
      } else {
        home.t += 1;
      }
    }

    if (away) {
      away.played += 1;
      away.pf += awayScore;
      away.pa += homeScore;

      if (awayScore > homeScore) {
        away.w += 1;
      } else if (awayScore < homeScore) {
        away.l += 1;
      } else {
        away.t += 1;
      }
    }
  });

  const getWinPct = row => {
    if (!row.played) return 0;
    return (row.w + row.t * 0.5) / row.played;
  };

  const getPointDiff = row => row.pf - row.pa;

  const getHeadToHeadStats = (teamId, tiedTeamIds) => {
    const tiedSet = new Set(tiedTeamIds);

    const h2h = {
      played: 0,
      w: 0,
      l: 0,
      t: 0,
      pf: 0,
      pa: 0,
    };

    relevantGames.forEach(game => {
      const isHomeTeam = game.homeTeamId === teamId && tiedSet.has(game.awayTeamId);
      const isAwayTeam = game.awayTeamId === teamId && tiedSet.has(game.homeTeamId);

      if (!isHomeTeam && !isAwayTeam) return;

      const teamScore = Number(isHomeTeam ? game.scoreHome || 0 : game.scoreAway || 0);
      const opponentScore = Number(isHomeTeam ? game.scoreAway || 0 : game.scoreHome || 0);

      h2h.played += 1;
      h2h.pf += teamScore;
      h2h.pa += opponentScore;

      if (teamScore > opponentScore) {
        h2h.w += 1;
      } else if (teamScore < opponentScore) {
        h2h.l += 1;
      } else {
        h2h.t += 1;
      }
    });

    return h2h;
  };

  const compareByAfvdTieBreakers = (a, b, tiedTeamIds) => {
    const aH2H = getHeadToHeadStats(a.teamId, tiedTeamIds);
    const bH2H = getHeadToHeadStats(b.teamId, tiedTeamIds);

    // 1. Direkter Siegquotientenvergleich der punktgleichen Teams untereinander
    if (aH2H.played > 0 || bH2H.played > 0) {
      const aH2HPct = getWinPct(aH2H);
      const bH2HPct = getWinPct(bH2H);

      if (bH2HPct !== aH2HPct) return bH2HPct - aH2HPct;

      // 2. Spielpunkte-Differenz untereinander
      const aH2HDiff = getPointDiff(aH2H);
      const bH2HDiff = getPointDiff(bH2H);

      if (bH2HDiff !== aH2HDiff) return bH2HDiff - aH2HDiff;
    }

    // 3. Spielpunkte-Differenz gesamte Saison
    const aDiff = getPointDiff(a);
    const bDiff = getPointDiff(b);

    if (bDiff !== aDiff) return bDiff - aDiff;

    // 4. Positive Spielpunkte gesamte Saison
    if (b.pf !== a.pf) return b.pf - a.pf;

    // 5. Strafyards sind aktuell nicht vorhanden.
    // 6. Technischer Fallback statt Losentscheid: alphabetisch.
    const teamAName = teamsById[a.teamId]?.name || '';
    const teamBName = teamsById[b.teamId]?.name || '';

    return teamAName.localeCompare(teamBName, 'de');
  };

  const rows = Object.values(stats);

  const pctGroups = rows.reduce((groups, row) => {
    const pctKey = getWinPct(row).toFixed(6);

    if (!groups[pctKey]) groups[pctKey] = [];
    groups[pctKey].push(row);

    return groups;
  }, {});

  return Object.keys(pctGroups)
    .sort((a, b) => Number(b) - Number(a))
    .flatMap(pctKey => {
      const group = pctGroups[pctKey];

      if (group.length === 1) return group;

      const tiedTeamIds = group.map(row => row.teamId);

      return [...group].sort((a, b) => compareByAfvdTieBreakers(a, b, tiedTeamIds));
    });
}

function getGroupOptions(league) {
  const groups = Array.isArray(league?.groups) ? league.groups : [];

  return groups
    .map(group => ({
      id: group.id || group.shortName || group.name,
      name: group.name || group.shortName || group.id,
      displayOrder: group.displayOrder || 0,
    }))
    .filter(group => group.id)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function getZonesForGroup({ standingsConfigs = [], groupId }) {
  const key = groupId || 'all';
  const config = standingsConfigs.find(item => normalizeId(item.groupId || 'all') === normalizeId(key));
  return config?.zones || [];
}

function buildVisibleTabs({ league, teams, groups, publicTableMode }) {
  if (!league?.id || groups.length === 0) {
    return [{ id: 'all', name: 'Gesamttabelle' }];
  }

  const groupsWithTeams = groups.filter(group =>
    teams.some(team =>
      team.leagueId === league.id &&
      normalizeId(team.groupId) === normalizeId(group.id)
    )
  );

  const usableGroups = groupsWithTeams.length > 0 ? groupsWithTeams : groups;

  if (publicTableMode === 'overall_only') {
    return [{ id: 'all', name: 'Gesamttabelle' }];
  }

  if (publicTableMode === 'groups_and_overall') {
    return [
      { id: 'all', name: 'Gesamttabelle' },
      ...usableGroups,
    ];
  }

  if (usableGroups.length > 0) return usableGroups;

  return [{ id: 'all', name: 'Gesamttabelle' }];
}

export default function LeagueStandingsTab({ league }) {
  const {
    teams = [],
    games = [],
    gamesLoading,
    standingsConfigs = [],
    clubsById,
  } = useGlobalData();

  const theme = useLeagueTheme(league?.primaryColor);
  const groups = useMemo(() => getGroupOptions(league), [league]);
  const publicTableMode = league?.publicTableMode || (groups.length > 0 ? 'groups_only' : 'overall_only');

  const visibleTabs = useMemo(() => {
    return buildVisibleTabs({
      league,
      teams,
      groups,
      publicTableMode,
    });
  }, [groups, league, publicTableMode, teams]);

  const [activeGroup, setActiveGroup] = useState(null);

  const resolvedGroup = useMemo(() => {
    if (activeGroup && visibleTabs.some(tab => tab.id === activeGroup)) return activeGroup;
    return visibleTabs[0]?.id || 'all';
  }, [activeGroup, visibleTabs]);

  const standingsRows = useMemo(() => {
    return computeStandings({
      league,
      games,
      teams,
      groupId: resolvedGroup,
    });
  }, [games, league, resolvedGroup, teams]);

  const teamsByIdMap = useMemo(() => {
    return Object.fromEntries(teams.map(team => [team.id, team]));
  }, [teams]);

  const leagueConfigs = useMemo(() => {
    return standingsConfigs.filter(config => config.leagueId === league?.id);
  }, [league?.id, standingsConfigs]);

  const zones = useMemo(() => {
    return getZonesForGroup({
      standingsConfigs: leagueConfigs,
      groupId: resolvedGroup,
    });
  }, [leagueConfigs, resolvedGroup]);

  if (gamesLoading && standingsRows.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {visibleTabs.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveGroup(tab.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                resolvedGroup === tab.id
                  ? theme.color
                    ? theme.groupTabActive
                    : { backgroundColor: 'hsl(var(--primary))', color: '#fff' }
                  : { backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {standingsRows.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Noch keine Teams oder Spiele für diese Tabelle.
        </div>
      ) : (
        <StandingsTable
          rows={standingsRows}
          teamsById={teamsByIdMap}
          zones={zones}
          clubsById={clubsById}
        />
      )}
    </div>
  );
}