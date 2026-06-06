import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { getImageUrl } from '@/lib/imageUtils';
import StandingsTable from '@/components/standings/StandingsTable';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useLeagueTheme } from '@/lib/useLeagueTheme';

function sameSeason(game, season) {
  if (!season) return true;
  return !game.season || game.season === season;
}

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
    groupId: team.groupId || '',
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
      withdrawn: isWithdrawn(team),
      withdrawnBeforeSeason: isWithdrawnBeforeSeason(team),
    };
  });

  const relevantGames = games.filter(game => {
    if (game.status !== 'final') return false;
    if (game.leagueId !== league.id) return false;
    if (!sameSeason(game, league.season)) return false;
    if (game.isCompetitionGame || game.competitionId || game.tournamentId) return false;

    const homeTeam = teamsById[game.homeTeamId];
    const awayTeam = teamsById[game.awayTeamId];

    if (isWithdrawnBeforeSeason(homeTeam) || isWithdrawnBeforeSeason(awayTeam)) {
      return false;
    }

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
    if (isWithdrawnBeforeSeason(team)) {
      stats[team.id] = createZeroWithdrawnRow(team);
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

  const activeRows = rows.filter(row => row.withdrawn !== true);
  const withdrawnRows = rows.filter(row => row.withdrawn === true);

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

  const sortedWithdrawnRows = [...withdrawnRows].sort((a, b) => {
    const aBeforeSeason = a.withdrawnBeforeSeason === true ? 1 : 0;
    const bBeforeSeason = b.withdrawnBeforeSeason === true ? 1 : 0;

    if (bBeforeSeason !== aBeforeSeason) return bBeforeSeason - aBeforeSeason;

    const teamAName = teamsById[a.teamId]?.name || '';
    const teamBName = teamsById[b.teamId]?.name || '';

    return teamAName.localeCompare(teamBName, 'de');
  });

  return [
    ...sortedActiveRows,
    ...sortedWithdrawnRows,
  ];
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

function LeagueLogo({ league }) {
  if (league.logo) {
    return (
      <img
        src={getImageUrl(league.logo)}
        alt=""
        className="max-w-11 max-h-11 w-auto h-auto object-contain"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <span className="text-base font-black text-muted-foreground">
      {league.name?.[0] || 'L'}
    </span>
  );
}

export default function LeagueStandings() {
  const { leagueId } = useParams();
  const navigate = useNavigate();

  const {
    leagues = [],
    teams = [],
    games = [],
    gamesLoading,
    standingsConfigs = [],
    clubsById,
  } = useGlobalData();

  const league = leagues.find(item => item.id === leagueId);
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
    return standingsConfigs.filter(config => config.leagueId === leagueId);
  }, [leagueId, standingsConfigs]);

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

  if (!league) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Liga nicht gefunden.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24">
      <div
        className="flex items-center gap-3 px-3 pt-4 pb-4 border-b border-border/30 transition-all duration-500"
        style={theme.color ? theme.gradientHeader : {}}
      >
        <button
          type="button"
          onClick={() => navigate('/match-center')}
          className="p-1.5 rounded-lg hover:bg-secondary flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-secondary/40 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          <LeagueLogo league={league} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-base font-black truncate">{league.name}</h1>

          <p className="text-[11px] text-muted-foreground truncate">
            {[league.country, league.regionState || league.stateRegion, league.season].filter(Boolean).join(' · ') || 'Tabelle'}
          </p>
        </div>

        <Link
          to={`/league/${leagueId}`}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-primary/10"
        >
          Details
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {visibleTabs.length > 1 && (
        <div className="px-3 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveGroup(tab.id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap"
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
        </div>
      )}

      <div className="px-3 pt-4">
        {standingsRows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Keine Tabellen-Daten vorhanden.
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
    </div>
  );
}
