import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sortLeagues } from '@/lib/leagueSort';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExternalLink, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSetHeader from '@/hooks/useSetHeader';
import StandingsTable from '@/components/standings/StandingsTable';
import { toast } from 'sonner';

const ZONE_TYPE_OPTIONS = [
  { value: 'playoffs', label: 'Playoffs' },
  { value: 'playdowns', label: 'Playdowns' },
  { value: 'abstieg', label: 'Abstieg' },
];

const PUBLIC_TABLE_MODE_OPTIONS = [
  { value: 'groups_only', label: 'Nur Gruppen' },
  { value: 'groups_and_overall', label: 'Gruppen + Gesamttabelle' },
  { value: 'overall_only', label: 'Nur Gesamttabelle' },
];

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
    }))
    .filter(group => group.id);
}

function getConfigKey(leagueId, groupId) {
  return `${leagueId || ''}|${groupId || 'all'}`;
}

export default function AdminStandings() {
  useSetHeader({ mode: 'back', title: 'Tabellen' });

  const queryClient = useQueryClient();

  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [editingZonesByKey, setEditingZonesByKey] = useState({});
  const [publicTableModeDraft, setPublicTableModeDraft] = useState('groups_only');

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-leagues-s'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-teams-s'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: games = [] } = useQuery({
    queryKey: ['admin-games-s'],
    queryFn: () => base44.entities.Game.list('-date', 1000),
  });

  const { data: standingsConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['admin-standings-configs', selectedLeagueId],
    queryFn: () => base44.entities.StandingsConfig.filter({ leagueId: selectedLeagueId }),
    enabled: !!selectedLeagueId,
  });

  const selectedLeague = leagues.find(league => league.id === selectedLeagueId);
  const groups = getGroupOptions(selectedLeague);
  const hasGroups = groups.length > 0;
  const selectedGroupKey = hasGroups ? selectedGroupId : 'all';

  const overallConfig = standingsConfigs.find(config => (config.groupId || 'all') === 'all');
  const currentConfig = standingsConfigs.find(config => (config.groupId || 'all') === selectedGroupKey);

  useEffect(() => {
    if (!selectedLeagueId) return;

    setPublicTableModeDraft(
      overallConfig?.publicTableMode ||
      selectedLeague?.publicTableMode ||
      (hasGroups ? 'groups_only' : 'overall_only')
    );
  }, [hasGroups, overallConfig?.publicTableMode, selectedLeague?.publicTableMode, selectedLeagueId]);

  const groupedLeagues = useMemo(() => {
    const sorted = sortLeagues([...leagues]);
    const grouped = {};

    sorted.forEach(league => {
      const continent = league.continent || 'Sonstige';
      const country = league.country || 'Sonstige';
      const key = `${continent}||${country}`;

      if (!grouped[key]) {
        grouped[key] = {
          continent,
          country,
          leagues: [],
        };
      }

      grouped[key].leagues.push(league);
    });

    return Object.values(grouped);
  }, [leagues]);

  const teamsById = useMemo(() => {
    return Object.fromEntries(teams.map(team => [team.id, team]));
  }, [teams]);

  const standingsRows = useMemo(() => {
    return computeStandings({
      league: selectedLeague,
      games,
      teams,
      groupId: selectedGroupKey,
    });
  }, [games, selectedGroupKey, selectedLeague, teams]);

  const activeConfigKey = getConfigKey(selectedLeagueId, selectedGroupKey);

  const activeZones = useMemo(() => {
    if (editingZonesByKey[activeConfigKey]) return editingZonesByKey[activeConfigKey];
    return currentConfig?.zones || [];
  }, [activeConfigKey, currentConfig?.zones, editingZonesByKey]);

  const setActiveZones = zones => {
    setEditingZonesByKey(prev => ({
      ...prev,
      [activeConfigKey]: zones,
    }));
  };

  const saveZonesMutation = useMutation({
    mutationFn: async zones => {
      const payload = {
        leagueId: selectedLeagueId,
        groupId: selectedGroupKey,
        zones,
        updatedAtUtc: new Date().toISOString(),
      };

      if (currentConfig) {
        await base44.entities.StandingsConfig.update(currentConfig.id, payload);
        return currentConfig.id;
      }

      const created = await base44.entities.StandingsConfig.create({
        ...payload,
        createdAtUtc: new Date().toISOString(),
      });

      return created?.id || null;
    },
    onSuccess: () => {
      toast.success('Tabellen-Zonen gespeichert');
      queryClient.invalidateQueries({ queryKey: ['admin-standings-configs', selectedLeagueId] });
      queryClient.invalidateQueries({ queryKey: ['standingsConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['standingsConfigs', selectedLeagueId] });
    },
    onError: error => {
      console.error('SAVE STANDINGS CONFIG ERROR:', error);
      toast.error('Zonen konnten nicht gespeichert werden');
    },
  });

  const savePublicModeMutation = useMutation({
    mutationFn: async nextMode => {
      if (!selectedLeagueId) return null;

      await base44.entities.League.update(selectedLeagueId, {
        publicTableMode: nextMode,
        showOverallStandingsPublic: nextMode !== 'groups_only',
        updatedAtUtc: new Date().toISOString(),
      });

      const payload = {
        leagueId: selectedLeagueId,
        groupId: 'all',
        zones: overallConfig?.zones || [],
        publicTableMode: nextMode,
        updatedAtUtc: new Date().toISOString(),
      };

      if (overallConfig) {
        await base44.entities.StandingsConfig.update(overallConfig.id, payload);
      } else {
        await base44.entities.StandingsConfig.create({
          ...payload,
          createdAtUtc: new Date().toISOString(),
        });
      }

      return nextMode;
    },
    onSuccess: () => {
      toast.success('Nutzer-Sicht gespeichert');
      queryClient.invalidateQueries({ queryKey: ['admin-leagues-s'] });
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-standings-configs', selectedLeagueId] });
      queryClient.invalidateQueries({ queryKey: ['standingsConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['standingsConfigs', selectedLeagueId] });
    },
    onError: error => {
      console.error('SAVE PUBLIC TABLE MODE ERROR:', error);
      toast.error('Nutzer-Sicht konnte nicht gespeichert werden');
    },
  });

  const handleLeagueChange = leagueId => {
    const nextLeague = leagues.find(league => league.id === leagueId);
    const nextHasGroups = Array.isArray(nextLeague?.groups) && nextLeague.groups.length > 0;

    setSelectedLeagueId(leagueId);
    setSelectedGroupId('all');
    setEditingZonesByKey({});
    setPublicTableModeDraft(nextLeague?.publicTableMode || (nextHasGroups ? 'groups_only' : 'overall_only'));
  };

  const handlePublicTableModeChange = value => {
    setPublicTableModeDraft(value);
    savePublicModeMutation.mutate(value);
  };

  const addZone = () => {
    setActiveZones([
      ...activeZones,
      {
        label: 'Playoffs',
        type: 'playoffs',
        fromRank: 1,
        toRank: 1,
      },
    ]);
  };

  const updateZone = (index, field, value) => {
    setActiveZones(
      activeZones.map((zone, currentIndex) => {
        if (currentIndex !== index) return zone;

        return {
          ...zone,
          [field]: value,
        };
      })
    );
  };

  const removeZone = index => {
    setActiveZones(activeZones.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveZones = () => {
    if (!selectedLeagueId) {
      toast.error('Bitte zuerst eine Liga auswählen');
      return;
    }

    const normalizedZones = activeZones.map(zone => ({
      ...zone,
      label: zone.label || ZONE_TYPE_OPTIONS.find(item => item.value === zone.type)?.label || 'Zone',
      fromRank: Number(zone.fromRank || 1),
      toRank: Number(zone.toRank || zone.fromRank || 1),
    }));

    saveZonesMutation.mutate(normalizedZones);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-4 py-6 pb-24">
      <p className="text-xs text-muted-foreground mb-4">
        Hier markierst du Tabellenplätze. Diese Markierungen sind die Grundlage für Wettbewerbe und Playoff-Qualifikation.
      </p>

      <Select value={selectedLeagueId} onValueChange={handleLeagueChange}>
        <SelectTrigger className="w-full mb-4">
          <SelectValue placeholder="Liga auswählen" />
        </SelectTrigger>
        <SelectContent>
          {groupedLeagues.map(({ continent, country, leagues: leagueGroup }) => (
            <SelectGroup key={`${continent}||${country}`}>
              <SelectLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {continent} · {country}
              </SelectLabel>

              {leagueGroup.map(league => (
                <SelectItem key={league.id} value={league.id}>
                  <span>{league.name}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {[league.regionState, league.country, league.season].filter(Boolean).join(' · ')}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {selectedLeagueId && (
        <>
          <Card className="p-4 mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold">Tabellen-Ansicht</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin kann Gesamttabelle und Gruppen bearbeiten. Nutzer-Sicht stellst du separat ein.
                </p>
              </div>

              <Link to={`/tabellen/${selectedLeagueId}`} className="flex items-center gap-1 text-xs text-primary">
                <ExternalLink className="w-3 h-3" />
                Öffentlich
              </Link>
            </div>

            {hasGroups && (
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedGroupKey === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  Gesamttabelle
                </button>

                {groups.map(group => (
                  <button
                    type="button"
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      selectedGroupKey === group.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}

            {hasGroups && (
              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Nutzer-Sicht
                </label>

                <Select
                  value={publicTableModeDraft}
                  onValueChange={handlePublicTableModeChange}
                  disabled={savePublicModeMutation.isPending}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLIC_TABLE_MODE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-[10px] text-muted-foreground mt-2">
                  Die Auswahl springt jetzt sofort um und wird zusätzlich in der Gesamttabellen-Konfiguration gespeichert.
                </p>
              </div>
            )}
          </Card>

          <div className="mb-4">
            {configsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <StandingsTable
                rows={standingsRows}
                teamsById={teamsById}
                zones={activeZones}
              />
            )}
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold">Zonen markieren</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktuelle Ansicht: {selectedGroupKey === 'all' ? 'Gesamttabelle' : groups.find(group => group.id === selectedGroupKey)?.name}
                </p>
              </div>

              <Button size="sm" variant="outline" onClick={addZone} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Zone
              </Button>
            </div>

            {activeZones.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Keine Zonen definiert.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {activeZones.map((zone, index) => (
                  <div key={index} className="rounded-xl border border-border/50 bg-secondary/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={zone.label}
                        onChange={event => updateZone(index, 'label', event.target.value)}
                        placeholder="Name, z.B. Playoffs"
                        className="h-8 text-xs flex-1"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeZone(index)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Select value={zone.type} onValueChange={value => updateZone(index, 'type', value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONE_TYPE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="1"
                        value={zone.fromRank}
                        onChange={event => updateZone(index, 'fromRank', Number(event.target.value || 1))}
                        placeholder="Von"
                        className="h-8 text-xs"
                      />

                      <Input
                        type="number"
                        min="1"
                        value={zone.toRank}
                        onChange={event => updateZone(index, 'toRank', Number(event.target.value || 1))}
                        placeholder="Bis"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {activeZones.map((zone, index) => (
                <Badge key={index} variant="outline" className="text-[10px]">
                  {zone.label || zone.type}: #{zone.fromRank} bis #{zone.toRank}
                </Badge>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={saveZonesMutation.isPending}
              onClick={handleSaveZones}
            >
              {saveZonesMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Zonen speichern
                </>
              )}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}