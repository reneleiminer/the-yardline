import React, { useMemo, useState } from 'react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import StandingsTable from '@/components/standings/StandingsTable';
import { useLeagueTheme } from '@/lib/useLeagueTheme';

function normalizeId(value) {
  return String(value || '').trim();
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
    groupId: team.groupId || null,
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

function computeStandings(leagueId, allGames, allTeams, groupId = null) {
  const resolvedGroupId = normalizeId(groupId || 'all');

  const leagueTeams = allTeams.filter(team => {
    if (team.leagueId !== leagueId) return false;
    if (resolvedGroupId !== 'all' && normalizeId(team.groupId) !== resolvedGroupId) return false;
    return true;
  });

  const teamsById = Object.fromEntries(allTeams.map(team => [team.id, team]));
  const stats = {};

  leagueTeams.forEach(team => {
    stats[team.id] = {
      teamId: team.id,
      groupId: team.groupId || null,
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

  const relevantGames = allGames.filter(game => {
    if (game.status !== 'final') return false;
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

    if (home && home.withdrawnBeforeSeason !== true) {
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

    if (away && away.withdrawnBeforeSeason !== true) {
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

  leagueTeams.forEach(team => {
    if (isWithdrawnBeforeSeason(team)) stats[team.id] = createZeroWithdrawnRow(team);
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

  const activeRows = Object.values(stats).filter(row => row.withdrawn !== true);
  const withdrawnRows = Object.values(stats).filter(row => row.withdrawn === true);

  const pctGroups = activeRows.reduce((groups, row) => {
    const pctKey = getWinPct(row).toFixed(6);

    if (!groups[pctKey]) groups[pctKey] = [];
    groups[pctKey].push(row);

    return groups;
  }, {});

  const sortedActiveRows = Object.keys(pctGroups)
    .sort((a, b) => Number(b) - Number(a))
    .flatMap(pctKey => {
      const group = pctGroups[pctKey];

      if (group.length === 1) return group;

      const tiedTeamIds = group.map(row => row.teamId);

      return [...group].sort((a, b) => compareByAfvdTieBreakers(a, b, tiedTeamIds));
    });

  const sortedWithdrawnRows = [...withdrawnRows].sort((a, b) =>
    (teamsById[a.teamId]?.name || '').localeCompare(teamsById[b.teamId]?.name || '', 'de')
  );

  return [...sortedActiveRows, ...sortedWithdrawnRows];
}

export default function ClubStandingsTab({ club }) {
  const { leagues, teams, games, standingsConfigs, teamsById: teamsByIdMap, clubsById } = useGlobalData();
  const [activeGroup, setActiveGroup] = useState(null);

  // Find matching team in the Team entity by name, because Club.id is not always Team.id.
  const matchedTeam = useMemo(() => {
    if (teamsByIdMap[club.id]) return teamsByIdMap[club.id];

    return teams.find(t =>
      t.leagueId === club.leagueId &&
      (t.name === club.name || t.shortName === club.shortName || t.shortName === club.name || t.name === club.shortName)
    ) || null;
  }, [club, teams, teamsByIdMap]);

  const league = leagues.find(l => l.id === club.leagueId);
  const theme = useLeagueTheme(league?.primaryColor || club.primaryColor);

  const hasGroups = !!(league?.groupsEnabled && league?.groups?.length > 0);
  const groups = league?.groups ? [...league.groups].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) : [];

  // Default to club's group.
  const clubGroupId = matchedTeam?.groupId || null;
  const resolvedGroup = activeGroup ?? (hasGroups ? (clubGroupId || groups[0]?.id) : null);

  const standings = useMemo(() =>
    club.leagueId ? computeStandings(club.leagueId, games, teams, hasGroups ? resolvedGroup : 'all') : [],
    [club.leagueId, games, teams, hasGroups, resolvedGroup]
  );

  const leagueConfigs = standingsConfigs.filter(c => c.leagueId === club.leagueId);

  const zones = useMemo(() => {
    const key = resolvedGroup || 'all';
    const cfg = leagueConfigs.find(c => c.groupId === key) || leagueConfigs.find(c => !c.groupId || c.groupId === 'all');
    return cfg?.zones || [];
  }, [leagueConfigs, resolvedGroup]);

  const teamsMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  if (!club.leagueId) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground px-4">
        Dieser Verein ist keiner Liga zugeordnet.
      </div>
    );
  }

  return (
    <div className="px-3 py-4 pb-24">
      {league && (
        <p className="text-xs text-muted-foreground mb-3">
          {league.name}{league.season ? ` · ${league.season}` : ''}
        </p>
      )}

      {hasGroups && (
        <div className="flex gap-2 flex-wrap mb-3">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={resolvedGroup === g.id
                ? (theme.color
                    ? { backgroundColor: theme.color + '22', borderColor: theme.color, color: theme.color }
                    : { backgroundColor: 'hsl(var(--primary)/0.15)', borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' })
                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {standings.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Noch keine Daten für diese Gruppe.
        </div>
      ) : (
        <StandingsTable
          rows={standings}
          teamsById={teamsMap}
          zones={zones}
          highlightTeamId={matchedTeam?.id}
          clubsById={clubsById}
        />
      )}
    </div>
  );
}
