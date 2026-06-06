import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ChevronRight, CalendarDays, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import CompetitionWizard from '@/components/competitions/CompetitionWizard';
import { getImageUrl } from '@/lib/imageUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STATUS_LABELS = {
  upcoming: 'Ausstehend',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
};

const COMPETITION_TYPE_LABELS = {
  playoffs: 'Playoffs',
  relegation: 'Relegation',
  playdowns: 'Playdowns',
  bowl: 'Bowl / Finale',
  cup: 'Cup',
  promotion: 'Aufstiegsspiele',
  tournament: 'Turnier',
  other: 'Sonstiger Wettbewerb',
  Playoffs: 'Playoffs',
};

const COMPETITION_FORMAT_LABELS = {
  bracket: 'Bracket',
  single_game: 'Einzelspiel',
  two_leg: 'Hin- & Rückspiel',
  series: 'Serie',
  custom: 'Freies Format',
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || '—';
}

function getCompetitionTypeLabel(type) {
  return COMPETITION_TYPE_LABELS[type] || type || 'Wettbewerb';
}

function getCompetitionFormatLabel(format) {
  return COMPETITION_FORMAT_LABELS[format] || format || 'Format offen';
}

function getCompetitionPublicName(comp) {
  return comp.publicName || comp.displayName || comp.name || 'Wettbewerb';
}

function getSourceLabel(source) {
  if (!source) return 'Teilnehmer offen';

  if (source.type === 'winner') {
    return `Sieger Runde ${source.round || '?'} Spiel ${Number(source.matchupIndex || 0) + 1}`;
  }

  if (source.type === 'manual') {
    return source.label || 'Teilnehmer offen';
  }

  if (source.scope === 'group') {
    return `Gruppe Platz ${source.position || 1}`;
  }

  return `Gesamttabelle Platz ${source.position || 1}`;
}

function getBracketSourceCount(bracket = []) {
  return bracket.reduce((sum, round) => {
    const roundCount = (round.matchups || []).reduce((matchupSum, matchup) => {
      const sourceCount = [matchup.team1Source, matchup.team2Source]
        .filter(source => source?.type === 'standings')
        .length;

      return matchupSum + sourceCount;
    }, 0);

    return sum + roundCount;
  }, 0);
}

function getMatchupCount(bracket = []) {
  return bracket.reduce((sum, round) => sum + (round.matchups?.length || 0), 0);
}

function normalizeRoundNames(bracket = [], finalRoundName = '', highlightFinal = false) {
  if (!Array.isArray(bracket) || bracket.length === 0) return [];

  return bracket.map((round, index) => {
    const isLastRound = index === bracket.length - 1;

    if (!isLastRound || !finalRoundName) {
      return {
        ...round,
        isFinalRound: isLastRound,
        highlightFinal: isLastRound ? !!highlightFinal : false,
      };
    }

    return {
      ...round,
      name: finalRoundName,
      title: finalRoundName,
      roundName: finalRoundName,
      isFinalRound: true,
      highlightFinal: !!highlightFinal,
    };
  });
}

function buildTournamentPayload(formData) {
  const rawBracket = formData.bracket || formData.brackets || [];
  const now = new Date().toISOString();

  const competitionType =
    formData.competitionType ||
    formData.type ||
    'playoffs';

  const competitionFormat =
    formData.competitionFormat ||
    formData.format ||
    formData.system ||
    'bracket';

  const publicName =
    formData.publicName ||
    formData.displayName ||
    formData.publicDisplayName ||
    '';

  const finalRoundName =
    formData.finalRoundName ||
    formData.finalName ||
    formData.finalTitle ||
    '';

  const highlightFinal =
    formData.highlightFinal !== undefined
      ? !!formData.highlightFinal
      : !!finalRoundName;

  const bracket = normalizeRoundNames(rawBracket, finalRoundName, highlightFinal);

  const publicDisplaySettings = {
    showLeague: true,
    showSeason: true,
    showStatus: true,
    showBracketStats: true,
    ...(formData.publicDisplaySettings || {}),
    publicName,
    finalRoundName,
    highlightFinal,
  };

  return {
    name: formData.name,
    publicName,
    displayName: publicName,
    logo: formData.logo || null,
    banner: formData.banner || null,

    leagueId: formData.leagueId,
    season: formData.season || null,

    type: competitionType,
    competitionType,
    competitionFormat,
    format: competitionFormat,
    system: formData.system || competitionFormat || 'custom',

    finalRoundName,
    finalName: finalRoundName,
    highlightFinal,

    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    defaultVenue: formData.defaultVenue || null,
    championTitle: formData.championTitle || finalRoundName || 'Champion',

    isActive: formData.isActive !== false,
    isPublished: !!formData.isPublished,
    status: formData.status || 'upcoming',

    qualificationMode: formData.qualificationMode || 'standings_sources',
    autoFillAfterRegularSeason: true,
    autoCreateGamesAfterRegularSeason: true,
    createMissingGamesAfterRegularSeason: true,
    qualificationLockedUntilSeasonComplete: true,
    participantStatus: formData.participantStatus || 'pending_regular_season',

    qualificationRules: formData.qualificationRules || [],

    teamIds: formData.teamIds || [],
    gameIds: formData.gameIds || [],

    publicDisplaySettings,

    bracket,
    brackets: bracket,
    rounds: Number(formData.rounds || bracket.length || 0),

    createdFrom: 'admin_competition_wizard',
    createdAtUtc: formData.createdAtUtc || now,
    updatedAtUtc: now,
  };
}

function buildKickoffAt(date, time) {
  if (!date || !time) return '';

  const [hours, minutes] = String(time).split(':');
  const [year, month, day] = String(date).split('-');
  const kickoffDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours) || 0,
    Number(minutes) || 0,
    0,
    0
  );

  return Number.isNaN(kickoffDate.getTime()) ? '' : kickoffDate.toISOString();
}

function buildCompetitionGamePayload({ competition, round, matchup, index }) {
  const matchupIndex = matchup.matchupIndex ?? index;
  const roundName = round.name || round.roundName || round.title || `Runde ${round.round || 1}`;
  const date = matchup.date || '';
  const time = matchup.time || '';
  const homeTeamId = matchup.team1Id || '';
  const awayTeamId = matchup.team2Id || '';

  return {
    leagueId: competition.leagueId || '',
    competitionId: competition.id,
    tournamentId: competition.id,
    isCompetitionGame: true,

    homeTeamId,
    awayTeamId,
    homeTeamPlaceholder: matchup.team1Placeholder || getSourceLabel(matchup.team1Source),
    awayTeamPlaceholder: matchup.team2Placeholder || getSourceLabel(matchup.team2Source),
    teamsResolved: !!homeTeamId && !!awayTeamId,

    date,
    time,
    kickoffTime: time,
    kickoffAt: buildKickoffAt(date, time),
    venue:
      matchup.venue ||
      (round.venueMode === 'fixed'
        ? (round.venue || round.roundVenue || competition.defaultVenue || '')
        : ''),

    status: 'scheduled',
    scoreHome: 0,
    scoreAway: 0,
    roundName,
    round: round.round || 1,
    competitionRound: round.round || 1,
    matchupIndex,
    bracketPosition: `round_${round.round || 1}_matchup_${matchupIndex}`,
    season: competition.season || '',
  };
}

async function createGamesForCompetition(competition) {
  const bracket = competition.bracket || competition.brackets || [];
  const createdIds = [];

  for (const round of bracket) {
    for (const [index, matchup] of (round.matchups || []).entries()) {
      const created = await base44.entities.Game.create(
        buildCompetitionGamePayload({
          competition,
          round,
          matchup,
          index,
        })
      );

      if (created?.id) createdIds.push(created.id);
    }
  }

  if (createdIds.length > 0) {
    await base44.entities.Tournament.update(competition.id, {
      gameIds: [...new Set([...(competition.gameIds || []), ...createdIds])],
      updatedAtUtc: new Date().toISOString(),
    });
  }

  return createdIds;
}

export default function AdminCompetitions() {
  useSetHeader({ mode: 'back', title: 'Wettbewerbe' });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showWizard, setShowWizard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState('comp-only');

  const { data: competitions = [], isLoading: competitionsLoading } = useQuery({
    queryKey: ['adminCompetitions'],
    queryFn: () => base44.entities.Tournament.list('-created_date'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list(),
  });

  const leagueMap = Object.fromEntries(leagues.map(league => [league.id, league]));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminCompetitions'] });
    queryClient.invalidateQueries({ queryKey: ['competitions'] });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const createMutation = useMutation({
    mutationFn: async formData => {
      const payload = buildTournamentPayload(formData);
      const created = await base44.entities.Tournament.create(payload);
      const createdGameIds = await createGamesForCompetition({
        ...payload,
        ...created,
        id: created.id,
      });

      return {
        ...created,
        createdGameIds,
      };
    },
    onSuccess: result => {
      invalidate();
      const count = result?.createdGameIds?.length || 0;
      toast.success(count > 0
        ? `Wettbewerb erstellt und ${count} Spiel${count === 1 ? '' : 'e'} angelegt`
        : 'Wettbewerb erstellt');
      setShowWizard(false);
    },
    onError: error => {
      console.error('CREATE COMPETITION ERROR:', error);
      toast.error(error?.message || 'Fehler beim Erstellen');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ compId, deleteGames }) => {
      if (deleteGames) {
        const compGames = games.filter(game =>
          game.competitionId === compId ||
          game.tournamentId === compId
        );

        await Promise.all(compGames.map(game => base44.entities.Game.delete(game.id)));
      }

      await base44.entities.Tournament.delete(compId);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Wettbewerb gelöscht');
      setDeleteTarget(null);
      setDeleteMode('comp-only');
    },
    onError: error => {
      console.error('DELETE COMPETITION ERROR:', error);
      toast.error(error?.message || 'Fehler beim Löschen');
    },
  });

  const handleWizardSuccess = formData => {
    createMutation.mutate(formData);
  };

  const compGameCount = compId => {
    return games.filter(game =>
      game.competitionId === compId ||
      game.tournamentId === compId
    ).length;
  };

  if (competitionsLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24">
      <p className="text-xs text-muted-foreground mb-4">
        Erstelle Wettbewerbe wie Playoffs, German Bowl, Relegation, Playdowns oder Aufstiegsspiele. Der German Bowl kann als Finalrunde innerhalb der Playoffs geführt werden.
      </p>

      <Button
        onClick={() => setShowWizard(true)}
        className="w-full mb-5"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        Neuer Wettbewerb
      </Button>

      {showWizard && (
        <CompetitionWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleWizardSuccess}
        />
      )}

      <div className="space-y-3">
        {competitions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Keine Wettbewerbe erstellt.
          </p>
        ) : (
          competitions.map(comp => {
            const league = leagueMap[comp.leagueId];
            const bracket = comp.bracket || comp.brackets || [];
            const sourceCount = getBracketSourceCount(bracket);
            const matchupCount = getMatchupCount(bracket);
            const publicName = getCompetitionPublicName(comp);
            const competitionType = comp.competitionType || comp.type;
            const competitionFormat = comp.competitionFormat || comp.format || comp.system;
            const finalRoundName =
              comp.finalRoundName ||
              comp.finalName ||
              comp.publicDisplaySettings?.finalRoundName ||
              '';
            const firstSources = bracket
              .flatMap(round => round.matchups || [])
              .flatMap(matchup => [matchup.team1Source, matchup.team2Source])
              .filter(source => source?.type === 'standings')
              .slice(0, 6);

            return (
              <Card key={comp.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {comp.logo && (
                      <img
                        src={getImageUrl(comp.logo)}
                        alt=""
                        className="w-11 h-11 rounded-xl object-contain bg-secondary/40 border border-border/50 p-1 flex-shrink-0"
                        onError={event => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-tight">
                        {publicName}
                      </h4>

                      {publicName !== comp.name && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Intern: {comp.name}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1">
                        {getCompetitionTypeLabel(competitionType)}
                        {competitionFormat && ` • ${getCompetitionFormatLabel(competitionFormat)}`}
                        {comp.season && ` • ${comp.season}`}
                      </p>

                      <p className="text-[11px] text-muted-foreground mt-1">
                        {league?.name || 'Keine Liga verknüpft'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    {comp.isPublished ? (
                      <Badge className="text-[10px] bg-green-500/20 text-green-400 border-0">
                        Veröffentlicht
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Entwurf
                      </Badge>
                    )}

                    <Badge variant="secondary" className="text-[10px]">
                      {getStatusLabel(comp.status)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/30 border border-border/40 px-3 py-2 mb-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5" />
                      {bracket.length > 0
                        ? `${bracket.length} Runde${bracket.length === 1 ? '' : 'n'}`
                        : 'Noch kein Bracket'}
                    </span>

                    <span>•</span>

                    <span>
                      {matchupCount} Spiel{matchupCount === 1 ? '' : 'e'}
                    </span>

                    <span>•</span>

                    <span>
                      {sourceCount} Tabellen-Quelle{sourceCount === 1 ? '' : 'n'}
                    </span>
                  </div>

                  {finalRoundName && (
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-0">
                        Finale: {finalRoundName}
                      </Badge>
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground">
                    Teams werden aus den eingestellten Tabellenplätzen übernommen, sobald die Regular Season abgeschlossen ist.
                  </div>

                  {firstSources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {firstSources.map((source, index) => (
                        <Badge key={`${source.scope}-${source.groupId}-${source.position}-${index}`} variant="outline" className="text-[10px]">
                          {getSourceLabel(source)}
                        </Badge>
                      ))}

                      {sourceCount > firstSources.length && (
                        <Badge variant="outline" className="text-[10px]">
                          +{sourceCount - firstSources.length}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {(comp.startDate || comp.endDate) && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>
                      {[comp.startDate, comp.endDate].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/admin/competitions/${comp.id}`)}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs flex-1"
                  >
                    <ChevronRight className="w-3 h-3 mr-1" />
                    Details
                  </Button>

                  <Button
                    onClick={() => setDeleteTarget(comp)}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wettbewerb löschen?</AlertDialogTitle>

            <AlertDialogDescription>
              {deleteTarget && compGameCount(deleteTarget.id) > 0 ? (
                <div className="space-y-2 mt-3">
                  <p>
                    Dieser Wettbewerb hat {compGameCount(deleteTarget.id)} verknüpfte Spiele.
                  </p>

                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-secondary/30 p-2 rounded">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="comp-only"
                        checked={deleteMode === 'comp-only'}
                        onChange={event => setDeleteMode(event.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Nur Wettbewerb löschen</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer hover:bg-secondary/30 p-2 rounded">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="with-games"
                        checked={deleteMode === 'with-games'}
                        onChange={event => setDeleteMode(event.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        Wettbewerb + {compGameCount(deleteTarget.id)} Spiele löschen
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                'Der Wettbewerb wird endgültig gelöscht.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-2">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>

            <AlertDialogAction
              onClick={() =>
                deleteMutation.mutate({
                  compId: deleteTarget.id,
                  deleteGames: deleteMode === 'with-games',
                })
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Löschen'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
