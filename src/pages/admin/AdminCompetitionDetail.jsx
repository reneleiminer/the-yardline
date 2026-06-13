import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUploadField from '@/components/common/ImageUploadField';
import { getImageUrl } from '@/lib/imageUtils';
import {
  Calendar,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Save,
  Trash2,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS = {
  scheduled: 'Geplant',
  live: 'Live',
  final: 'Final',
};

const COMPETITION_STATUS_LABELS = {
  upcoming: 'Geplant',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
};

const STATUS_OPTIONS = ['upcoming', 'active', 'completed', 'inactive'];

const COMPETITION_TYPES = [
  { value: 'playoffs', label: 'Playoffs', tone: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { value: 'cup', label: 'Cup / Sonderturnier', tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { value: 'playdowns', label: 'Playdowns', tone: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  { value: 'relegation', label: 'Relegation / Aufstieg', tone: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
];

const BRACKET_COMPETITION_TYPES = new Set(['playoffs', 'cup']);
const GAME_LIST_COMPETITION_TYPES = new Set(['playdowns', 'relegation', 'promotion']);

function isBracketCompetitionType(type) {
  return BRACKET_COMPETITION_TYPES.has(type || 'playoffs');
}

function getCompetitionDisplayMode(type) {
  return isBracketCompetitionType(type) ? 'Turnierbaum' : 'Spielkarten';
}

function getCompetitionTypeTone(type) {
  return COMPETITION_TYPES.find(item => item.value === type)?.tone || 'bg-secondary text-muted-foreground border-border/60';
}

const COMPETITION_TYPE_LABELS = {
  playoffs: 'Playoffs',
  relegation: 'Relegation',
  playdowns: 'Playdowns',
  promotion: 'Relegation / Aufstieg',
  cup: 'Cup / Sonderturnier',
  Playoffs: 'Playoffs',
};

const COMPETITION_FORMAT_LABELS = {
  bracket: 'Bracket / KO-System',
  single_game: 'Einzelspiel',
  two_leg: 'Hin- & Rückspiel',
  series: 'Serie',
  custom: 'Freies Format',
  cards: 'Spielkarten',
};

const DEFAULT_DISPLAY_SETTINGS = {
  showLeague: true,
  showSeason: true,
  showStatus: true,
  showBracketStats: true,
  publicName: '',
  finalRoundName: '',
  highlightFinal: false,
};

function getCompetitionTypeLabel(type) {
  return COMPETITION_TYPE_LABELS[type] || type || 'Playoffs';
}

function getCompetitionFormatLabel(format) {
  return COMPETITION_FORMAT_LABELS[format] || format || 'Format offen';
}

function getPublicName(competition) {
  return competition?.publicName || competition?.displayName || competition?.name || 'Playoffs';
}

function normalizeBracketArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getCompetitionBracket(competition) {
  const bracket = normalizeBracketArray(competition?.bracket);
  if (bracket.length > 0) return bracket;
  return normalizeBracketArray(competition?.brackets);
}

function getFinalRoundName(competition) {
  return (
    competition?.finalRoundName ||
    competition?.finalName ||
    competition?.publicDisplaySettings?.finalRoundName ||
    ''
  );
}

function shouldHighlightFinal(competition) {
  if (competition?.highlightFinal !== undefined) return !!competition.highlightFinal;
  if (competition?.publicDisplaySettings?.highlightFinal !== undefined) {
    return !!competition.publicDisplaySettings.highlightFinal;
  }

  return !!getFinalRoundName(competition);
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

function getRegularSeasonGames(games = [], leagueId, season) {
  return games.filter(game => {
    if (game.leagueId !== leagueId) return false;
    if (!sameSeason(game, season)) return false;
    if (game.isCompetitionGame || game.competitionId || game.tournamentId) return false;
    return true;
  });
}

function isRegularSeasonComplete(games = [], leagueId, season) {
  const regularSeasonGames = getRegularSeasonGames(games, leagueId, season);
  if (regularSeasonGames.length === 0) return false;
  return regularSeasonGames.every(game => game.status === 'final');
}

function calculateStandings({ league, teams = [], games = [], season }) {
  if (!league?.id) return [];

  const leagueTeams = teams.filter(team =>
    team.leagueId === league.id &&
    !isWithdrawn(team)
  );

  const allLeagueTeamsById = Object.fromEntries(
    teams
      .filter(team => team.leagueId === league.id)
      .map(team => [team.id, team])
  );

  const regularSeasonGames = getRegularSeasonGames(games, league.id, season);
  const teamsById = Object.fromEntries(teams.map(team => [team.id, team]));
  const stats = {};

  leagueTeams.forEach(team => {
    stats[team.id] = {
      teamId: team.id,
      groupId: team.groupId || '',
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    };
  });

  regularSeasonGames
    .filter(game => game.status === 'final')
    .forEach(game => {
      const homeTeam = teamsById[game.homeTeamId];
      const awayTeam = teamsById[game.awayTeamId];

      if (homeTeam?.leagueId !== league.id || awayTeam?.leagueId !== league.id) return;

      const home = stats[game.homeTeamId];
      const away = stats[game.awayTeamId];

      const countHome = Boolean(home) && !isWithdrawnBeforeSeason(homeTeam);
      const countAway = Boolean(away) && !isWithdrawnBeforeSeason(awayTeam);

      if (!countHome && !countAway) return;

      const homeScore = Number(game.scoreHome || 0);
      const awayScore = Number(game.scoreAway || 0);

      if (countHome) {
        home.played += 1;
        home.pointsFor += homeScore;
        home.pointsAgainst += awayScore;
      }

      if (countAway) {
        away.played += 1;
        away.pointsFor += awayScore;
        away.pointsAgainst += homeScore;
      }

      if (homeScore > awayScore) {
        if (countHome) home.won += 1;
        if (countAway) away.lost += 1;
      } else if (awayScore > homeScore) {
        if (countAway) away.won += 1;
        if (countHome) home.lost += 1;
      } else {
        if (countHome) home.tied += 1;
        if (countAway) away.tied += 1;
      }
    });

  return Object.values(stats)
    .map(row => ({
      ...row,
      pointDiff: row.pointsFor - row.pointsAgainst,
      winPct: row.played > 0 ? (row.won + row.tied * 0.5) / row.played : 0,
    }))
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.won !== a.won) return b.won - a.won;
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return b.pointsFor - a.pointsFor;
    });
}

function resolveTeamIdFromSource({ source, standings, teamsById }) {
  if (!source || source.type !== 'standings') return null;

  const position = Number(source.position || 1);
  const rows = source.scope === 'group'
    ? standings.filter(row => {
        const team = teamsById[row.teamId];
        if (isWithdrawn(team)) return false;
        return team?.groupId === source.groupId;
      })
    : standings.filter(row => !isWithdrawn(teamsById[row.teamId]));

  return rows[position - 1]?.teamId || null;
}

function getWinnerIdFromGame(game) {
  if (!game || game.status !== 'final') return null;

  const homeScore = Number(game.scoreHome || 0);
  const awayScore = Number(game.scoreAway || 0);

  if (homeScore === awayScore) return null;

  return homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
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

function normalizeRoundMeta({ competition, round, roundIndex, totalRounds }) {
  const finalRoundName = getFinalRoundName(competition);
  const highlightFinal = shouldHighlightFinal(competition);
  const isFinalRound = roundIndex === totalRounds - 1;
  const resolvedName = isFinalRound && finalRoundName
    ? finalRoundName
    : round.name || round.title || round.roundName || `Runde ${round.round || roundIndex + 1}`;

  return {
    ...round,
    round: round.round || roundIndex + 1,
    name: resolvedName,
    title: resolvedName,
    roundName: resolvedName,
    isFinalRound,
    highlightFinal: isFinalRound ? highlightFinal : false,
  };
}

function resolveBracket({ competition, league, teams, games }) {
  const originalBracket = getCompetitionBracket(competition);
  const standings = calculateStandings({
    league,
    teams,
    games,
    season: competition?.season,
  });

  const teamsById = Object.fromEntries(teams.map(team => [team.id, team]));

  const competitionGames = games.filter(game =>
    game.competitionId === competition?.id ||
    game.tournamentId === competition?.id
  );

  const gamesByRoundMatchup = Object.fromEntries(
    competitionGames.map(game => [
      `${Number(game.round)}_${Number(game.matchupIndex)}`,
      game,
    ])
  );

  return originalBracket.map((rawRound, roundIndex) => {
    const round = normalizeRoundMeta({
      competition,
      round: rawRound,
      roundIndex,
      totalRounds: originalBracket.length,
    });

    return {
      ...round,
      matchups: (round.matchups || []).map((matchup, index) => {
        const matchupIndex = matchup.matchupIndex ?? index;

        const team1FromStandings = resolveTeamIdFromSource({
          source: matchup.team1Source,
          standings,
          teamsById,
        });

        const team2FromStandings = resolveTeamIdFromSource({
          source: matchup.team2Source,
          standings,
          teamsById,
        });

        let team1FromWinner = null;
        let team2FromWinner = null;

        if (matchup.team1Source?.type === 'winner') {
          const sourceGame = gamesByRoundMatchup[
            `${Number(matchup.team1Source.round)}_${Number(matchup.team1Source.matchupIndex)}`
          ];
          team1FromWinner = getWinnerIdFromGame(sourceGame);
        }

        if (matchup.team2Source?.type === 'winner') {
          const sourceGame = gamesByRoundMatchup[
            `${Number(matchup.team2Source.round)}_${Number(matchup.team2Source.matchupIndex)}`
          ];
          team2FromWinner = getWinnerIdFromGame(sourceGame);
        }

        return {
          ...matchup,
          matchupIndex,
          team1Id: matchup.team1Id || team1FromStandings || team1FromWinner || null,
          team2Id: matchup.team2Id || team2FromStandings || team2FromWinner || null,
          team1Placeholder: matchup.team1Placeholder || getSourceLabel(matchup.team1Source),
          team2Placeholder: matchup.team2Placeholder || getSourceLabel(matchup.team2Source),
        };
      }),
    };
  });
}

function getTeamName(teams, id, fallback = 'Teilnehmer offen') {
  if (!id) return fallback;
  const team = teams.find(item => item.id === id);
  return team?.shortName || team?.name || fallback;
}

function buildKickoffAt(date, time) {
  if (!date || !time) return '';

  const [hours, minutes] = time.split(':');
  const [year, month, day] = date.split('-');

  const kickoffDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours) || 0,
    Number(minutes) || 0,
    0,
    0
  );

  return kickoffDate.toISOString();
}

function buildGamePayload({ competition, matchup, gameFormData }) {
  const date = gameFormData.date || matchup.date || '';
  const time = gameFormData.time || matchup.time || '';
  const homeTeamId = gameFormData.homeTeamId || matchup.team1Id || '';
  const awayTeamId = gameFormData.awayTeamId || matchup.team2Id || '';

  return {
    leagueId: competition.leagueId || '',
    competitionId: competition.id,
    tournamentId: competition.id,
    isCompetitionGame: true,

    homeTeamId,
    awayTeamId,
    homeTeamPlaceholder: matchup.team1Placeholder || 'Teilnehmer offen',
    awayTeamPlaceholder: matchup.team2Placeholder || 'Teilnehmer offen',
    teamsResolved: !!homeTeamId && !!awayTeamId,

    date,
    time,
    kickoffTime: time,
    kickoffAt: buildKickoffAt(date, time),

    venue: gameFormData.venue || matchup.venue || competition.defaultVenue || '',
    status: 'scheduled',
    scoreHome: 0,
    scoreAway: 0,

    roundName: gameFormData.roundName || matchup.roundName || '',
    round: gameFormData.round ?? matchup.round ?? null,
    competitionRound: gameFormData.round ?? matchup.round ?? null,
    matchupIndex: gameFormData.matchupIndex ?? matchup.matchupIndex ?? null,
    bracketPosition:
      gameFormData.round !== null && gameFormData.matchupIndex !== null
        ? `round_${gameFormData.round}_matchup_${gameFormData.matchupIndex}`
        : '',

    season: competition.season || '',
  };
}

function findCompetitionGameForMatchup(games, round, matchup) {
  return games.find(game =>
    Number(game.round) === Number(round.round) &&
    Number(game.matchupIndex) === Number(matchup.matchupIndex)
  );
}

export default function AdminCompetitionDetail() {
  useSetHeader({ mode: 'back', title: 'Playoffs Details' });

  const { competitionId } = useParams();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showGameForm, setShowGameForm] = useState(false);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [autoProcessing, setAutoProcessing] = useState(false);

  const [gameFormData, setGameFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    date: '',
    time: '',
    venue: '',
    roundName: '',
    round: null,
    matchupIndex: null,
  });

  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => base44.entities.Tournament.filter({ id: competitionId }),
    select: data => data?.[0],
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-date', 1000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const league = leagues.find(item => item.id === competition?.leagueId);

  const leagueTeams = useMemo(() => {
    if (!competition?.leagueId) return [];
    return teams
      .filter(team => team.leagueId === competition.leagueId && team.withdrawn !== true)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [competition?.leagueId, teams]);

  const competitionGames = useMemo(() => {
    return games.filter(game =>
      game.competitionId === competitionId ||
      game.tournamentId === competitionId
    );
  }, [games, competitionId]);

  const regularSeasonComplete = competition
    ? isRegularSeasonComplete(games, competition.leagueId, competition.season)
    : false;

  const bracket = useMemo(() => {
    if (!competition) return [];

    if (!league) {
      const originalBracket = competition.bracket || competition.brackets || [];
      return originalBracket.map((round, roundIndex) => {
        const normalizedRound = normalizeRoundMeta({
          competition,
          round,
          roundIndex,
          totalRounds: originalBracket.length,
        });

        return {
          ...normalizedRound,
          matchups: (normalizedRound.matchups || []).map((matchup, index) => ({
            ...matchup,
            matchupIndex: matchup.matchupIndex ?? index,
          })),
        };
      });
    }

    return resolveBracket({ competition, league, teams, games });
  }, [competition, games, league, teams]);

  useEffect(() => {
    if (!competition) return;

    const publicDisplaySettings = {
      ...DEFAULT_DISPLAY_SETTINGS,
      ...(competition.publicDisplaySettings || {}),
      publicName: competition.publicName || competition.displayName || competition.publicDisplaySettings?.publicName || '',
      finalRoundName: getFinalRoundName(competition),
      highlightFinal: isBracketCompetitionType(competition.competitionType || competition.type || 'playoffs') && shouldHighlightFinal(competition),
    };

    setEditForm({
      name: competition.name || '',
      publicName: competition.publicName || competition.displayName || competition.publicDisplaySettings?.publicName || '',
      logo: competition.logo || '',
      banner: competition.banner || '',
      status: competition.status || 'upcoming',
      season: competition.season || '',
      competitionType: competition.competitionType || competition.type || 'playoffs',
      competitionFormat: isBracketCompetitionType(competition.competitionType || competition.type || 'playoffs') ? 'bracket' : 'cards',
      finalRoundName: getFinalRoundName(competition),
      highlightFinal: isBracketCompetitionType(competition.competitionType || competition.type || 'playoffs') && shouldHighlightFinal(competition),
      startDate: competition.startDate || '',
      endDate: competition.endDate || '',
      defaultVenue: competition.defaultVenue || '',
      championTitle: competition.championTitle || getFinalRoundName(competition) || 'Champion',
      qualificationDescription: competition.qualificationDescription || '',
      publicDisplaySettings,
      bracketNames: Object.fromEntries(
        (competition.bracket || competition.brackets || []).map((round, index, arr) => {
          const normalizedRound = normalizeRoundMeta({
            competition,
            round,
            roundIndex: index,
            totalRounds: arr.length,
          });

          return [
            normalizedRound.round,
            normalizedRound.name || `Runde ${normalizedRound.round}`,
          ];
        })
      ),
    });
  }, [competition]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
    queryClient.invalidateQueries({ queryKey: ['competitions'] });
    queryClient.invalidateQueries({ queryKey: ['adminCompetitions'] });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
  };

  const updateCompetitionMutation = useMutation({
    mutationFn: data => base44.entities.Tournament.update(competitionId, data),
    onSuccess: () => {
      invalidate();
      toast.success('Playoffs aktualisiert');
    },
    onError: error => {
      console.error('UPDATE COMPETITION ERROR:', error);
      toast.error('Playoffs konnte nicht aktualisiert werden');
    },
  });

  const createGameMutation = useMutation({
    mutationFn: data => base44.entities.Game.create(buildGamePayload({
      competition,
      matchup: selectedMatchup || {},
      gameFormData: data,
    })),
    onSuccess: created => {
      const currentGameIds = competition?.gameIds || [];
      if (created?.id && !currentGameIds.includes(created.id)) {
        base44.entities.Tournament.update(competitionId, {
          gameIds: [...currentGameIds, created.id],
          updatedAtUtc: new Date().toISOString(),
        });
      }

      invalidate();
      toast.success('Spieltermin erstellt');

      setGameFormData({
        homeTeamId: '',
        awayTeamId: '',
        date: '',
        time: '',
        venue: '',
        roundName: '',
        round: null,
        matchupIndex: null,
      });

      setSelectedMatchup(null);
      setShowGameForm(false);
    },
    onError: error => {
      console.error('CREATE COMPETITION GAME ERROR:', error);
      toast.error(error?.message || 'Fehler beim Erstellen des Spieltermins');
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: gameId => base44.entities.Game.delete(gameId),
    onSuccess: () => {
      invalidate();
      toast.success('Spiel gelöscht');
    },
    onError: error => {
      console.error('DELETE GAME ERROR:', error);
      toast.error('Fehler beim Löschen');
    },
  });

  const handleTogglePublished = () => {
    updateCompetitionMutation.mutate({
      isPublished: !competition.isPublished,
      updatedAtUtc: new Date().toISOString(),
    });
  };

  const ensureGamesForBracket = async (nextCompetition, nextBracket) => {
    if (!nextCompetition?.id || !Array.isArray(nextBracket) || nextBracket.length === 0) {
      return [];
    }

    const nextGameIds = [...(nextCompetition.gameIds || [])];
    const createdIds = [];

    for (const round of nextBracket) {
      for (const [index, matchup] of (round.matchups || []).entries()) {
        const normalizedMatchup = {
          ...matchup,
          round: round.round,
          roundName: round.name || round.roundName || `Runde ${round.round}`,
          matchupIndex: matchup.matchupIndex ?? index,
        };

        const existingGame = findCompetitionGameForMatchup(
          competitionGames,
          round,
          normalizedMatchup
        );

        if (existingGame) {
          const updates = {};

          if (!existingGame.roundName && normalizedMatchup.roundName) {
            updates.roundName = normalizedMatchup.roundName;
          }

          if (!existingGame.homeTeamId && normalizedMatchup.team1Id) {
            updates.homeTeamId = normalizedMatchup.team1Id;
          }

          if (!existingGame.awayTeamId && normalizedMatchup.team2Id) {
            updates.awayTeamId = normalizedMatchup.team2Id;
          }

          if (!existingGame.homeTeamPlaceholder && normalizedMatchup.team1Placeholder) {
            updates.homeTeamPlaceholder = normalizedMatchup.team1Placeholder;
          }

          if (!existingGame.awayTeamPlaceholder && normalizedMatchup.team2Placeholder) {
            updates.awayTeamPlaceholder = normalizedMatchup.team2Placeholder;
          }

          if (Object.keys(updates).length > 0) {
            await base44.entities.Game.update(existingGame.id, {
              ...updates,
              updatedAtUtc: new Date().toISOString(),
            });
          }

          if (existingGame.id && !nextGameIds.includes(existingGame.id)) {
            nextGameIds.push(existingGame.id);
          }

          continue;
        }

        const created = await base44.entities.Game.create(
          buildGamePayload({
            competition: nextCompetition,
            matchup: normalizedMatchup,
            gameFormData: {
              homeTeamId: normalizedMatchup.team1Id || '',
              awayTeamId: normalizedMatchup.team2Id || '',
              date: normalizedMatchup.date || '',
              time: normalizedMatchup.time || '',
              venue:
                normalizedMatchup.venue ||
                (round.venueMode === 'fixed'
                  ? (round.venue || round.roundVenue || nextCompetition.defaultVenue || '')
                  : ''),
              roundName: normalizedMatchup.roundName,
              round: round.round,
              matchupIndex: normalizedMatchup.matchupIndex,
            },
          })
        );

        if (created?.id) {
          createdIds.push(created.id);
          nextGameIds.push(created.id);
        }
      }
    }

    const uniqueGameIds = [...new Set(nextGameIds)];

    if (createdIds.length > 0 || uniqueGameIds.length !== (nextCompetition.gameIds || []).length) {
      await base44.entities.Tournament.update(nextCompetition.id, {
        gameIds: uniqueGameIds,
        updatedAtUtc: new Date().toISOString(),
      });
    }

    return createdIds;
  };

  const handleSaveCompetition = async () => {
    if (!editForm?.name?.trim()) {
      toast.error('Bitte Playoffssnamen eingeben.');
      return;
    }

    const originalBracket = competition.bracket || competition.brackets || [];
    const competitionType = editForm.competitionType || 'playoffs';
    const isBracketMode = isBracketCompetitionType(competitionType);
    const finalRoundName = isBracketMode ? editForm.finalRoundName?.trim() || '' : '';
    const highlightFinal = isBracketMode && !!editForm.highlightFinal;
    const competitionFormat = isBracketMode ? 'bracket' : 'cards';

    const renamedBracket = originalBracket.map((round, index) => {
      const isFinalRound = index === originalBracket.length - 1;
      const roundName = isFinalRound && finalRoundName
        ? finalRoundName
        : editForm.bracketNames?.[round.round] || round.name || `Runde ${round.round}`;

      return {
        ...round,
        name: roundName,
        title: roundName,
        roundName,
        isFinalRound,
        highlightFinal: isFinalRound ? highlightFinal : false,
        matchups: (round.matchups || []).map((matchup, matchupIndex) => ({
          ...matchup,
          matchupIndex: matchup.matchupIndex ?? matchupIndex,
        })),
      };
    });

    const publicDisplaySettings = {
      ...DEFAULT_DISPLAY_SETTINGS,
      ...(editForm.publicDisplaySettings || {}),
      publicName: editForm.publicName?.trim() || '',
      finalRoundName,
      highlightFinal,
    };

    const payload = {
      name: editForm.name.trim(),
      publicName: editForm.publicName?.trim() || '',
      displayName: editForm.publicName?.trim() || '',
      logo: editForm.logo || null,
      banner: editForm.banner || null,
      status: editForm.status,
      season: editForm.season,
      type: competitionType,
      competitionType,
      format: competitionFormat,
      competitionFormat,
      system: competitionFormat,
      finalRoundName,
      finalName: finalRoundName,
      highlightFinal,
      startDate: editForm.startDate || null,
      endDate: editForm.endDate || null,
      defaultVenue: editForm.defaultVenue || null,
      championTitle: editForm.championTitle || finalRoundName || 'Champion',
      qualificationDescription: editForm.qualificationDescription || '',
      publicDisplaySettings,
      bracket: renamedBracket,
      brackets: renamedBracket,
      rounds: renamedBracket.length,
      updatedAtUtc: new Date().toISOString(),
    };

    try {
      const updatedCompetition = await updateCompetitionMutation.mutateAsync(payload);
      const competitionForSync = {
        ...competition,
        ...payload,
        ...(updatedCompetition || {}),
        id: competition.id,
      };

      const createdIds = await ensureGamesForBracket(competitionForSync, renamedBracket);

      if (createdIds.length > 0) {
        toast.success(`${createdIds.length} Spiel${createdIds.length === 1 ? '' : 'e'} automatisch erstellt`);
      }

      invalidate();
      setEditMode(false);
    } catch (error) {
      console.error('SAVE COMPETITION WITH GAMES ERROR:', error);
      toast.error(error?.message || 'Playoffs konnte nicht gespeichert werden');
    }
  };

  const getMatchupGame = (round, matchup) => {
    return findCompetitionGameForMatchup(competitionGames, round, matchup);
  };

  const handleAutoFillGames = async () => {
    if (!competition || !league || !regularSeasonComplete) return;

    setAutoProcessing(true);

    try {
      const resolvedBracket = resolveBracket({ competition, league, teams, games });
      const teamIds = [
        ...new Set(
          resolvedBracket
            .flatMap(round => round.matchups || [])
            .flatMap(matchup => [matchup.team1Id, matchup.team2Id])
            .filter(Boolean)
        ),
      ].filter(teamId => {
        const team = teams.find(item => item.id === teamId);
        return team?.withdrawn !== true;
      });

      const updatedGameIds = [];

      for (const round of resolvedBracket) {
        for (const matchup of round.matchups || []) {
          const existingGame = competitionGames.find(game =>
            Number(game.round) === Number(round.round) &&
            Number(game.matchupIndex) === Number(matchup.matchupIndex)
          );

          if (!existingGame) continue;

          const homeTeam = teams.find(team => team.id === matchup.team1Id);
          const awayTeam = teams.find(team => team.id === matchup.team2Id);

          const homeTeamId = homeTeam?.withdrawn === true ? '' : matchup.team1Id || existingGame.homeTeamId || '';
          const awayTeamId = awayTeam?.withdrawn === true ? '' : matchup.team2Id || existingGame.awayTeamId || '';

          await base44.entities.Game.update(existingGame.id, {
            homeTeamId,
            awayTeamId,
            homeTeamPlaceholder: matchup.team1Placeholder || existingGame.homeTeamPlaceholder || 'Teilnehmer offen',
            awayTeamPlaceholder: matchup.team2Placeholder || existingGame.awayTeamPlaceholder || 'Teilnehmer offen',
            teamsResolved: !!homeTeamId && !!awayTeamId,
          });

          updatedGameIds.push(existingGame.id);
        }
      }

      await base44.entities.Tournament.update(competition.id, {
        bracket: resolvedBracket,
        brackets: resolvedBracket,
        teamIds,
        gameIds: [...new Set([...(competition.gameIds || []), ...updatedGameIds])],
        participantStatus: 'filled',
        status: competition.status === 'upcoming' ? 'active' : competition.status,
        updatedAtUtc: new Date().toISOString(),
      });

      invalidate();
      toast.success('Teams in vorhandene Spieltermine übernommen');
    } catch (error) {
      console.error('AUTO FILL COMPETITION ERROR:', error);
      toast.error('Automatische Übernahme fehlgeschlagen');
    } finally {
      setAutoProcessing(false);
    }
  };

  const openGameFormForMatchup = (round, matchup) => {
    setSelectedMatchup({
      ...matchup,
      round: round.round,
      roundName: round.name,
    });

    setGameFormData({
      homeTeamId: matchup.team1Id || '',
      awayTeamId: matchup.team2Id || '',
      date: matchup.date || '',
      time: matchup.time || '',
      venue: matchup.venue || (round.venueMode === 'fixed' ? (round.venue || round.roundVenue || competition.defaultVenue || '') : ''),
      roundName: round.name || '',
      round: round.round,
      matchupIndex: matchup.matchupIndex ?? null,
    });

    setShowGameForm(true);
  };

  const openFreeGameForm = () => {
    setSelectedMatchup(null);

    setGameFormData({
      homeTeamId: '',
      awayTeamId: '',
      date: '',
      time: '',
      venue: competition.defaultVenue || '',
      roundName: '',
      round: null,
      matchupIndex: null,
    });

    setShowGameForm(true);
  };

  if (compLoading || !competition || !editForm) {
    return (
      <div className="flex w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24 items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const publicName = getPublicName(competition);
  const internalName = competition.name || '';
  const competitionType = competition.competitionType || competition.type || 'playoffs';
  const competitionFormat = competition.competitionFormat || competition.format || competition.system || 'bracket';
  const finalRoundName = getFinalRoundName(competition);
  const isBracketMode = isBracketCompetitionType(competitionType);
  const displayMode = getCompetitionDisplayMode(competitionType);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24">
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {competition.logo && (
              <img
                src={getImageUrl(competition.logo)}
                alt=""
                className="w-12 h-12 rounded-xl object-contain bg-secondary/40 border border-border/50 p-1 flex-shrink-0"
                onError={event => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}

            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{publicName}</h2>

              {publicName !== internalName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Intern: {internalName}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                {competition.season || 'ohne Season'}
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                {league?.name || 'Keine Liga verknüpft'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => setEditMode(prev => !prev)} className="h-8 text-xs">
              {editMode ? <X className="w-3.5 h-3.5 mr-1" /> : <Pencil className="w-3.5 h-3.5 mr-1" />}
              {editMode ? 'Schließen' : 'Bearbeiten'}
            </Button>

            <Button
              size="sm"
              variant={competition.isPublished ? 'outline' : 'default'}
              onClick={handleTogglePublished}
              disabled={updateCompetitionMutation.isPending}
              className="h-8 text-xs"
            >
              {competition.isPublished ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {competition.isPublished ? 'Entöffentlichen' : 'Veröffentlichen'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant={competition.isPublished ? 'default' : 'outline'} className="text-[10px]">
            {competition.isPublished ? 'Veröffentlicht' : 'Entwurf'}
          </Badge>

          <Badge variant="secondary" className="text-[10px]">
            {COMPETITION_STATUS_LABELS[competition.status] || competition.status}
          </Badge>

          <Badge variant="outline" className={`text-[10px] ${getCompetitionTypeTone(competitionType)}`}>
            {getCompetitionTypeLabel(competitionType)}
          </Badge>

          <Badge className="text-[10px] bg-slate-500/15 text-slate-300 border-0">
            Ansicht: {displayMode}
          </Badge>

          {finalRoundName && (
            <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-0">
              Finale: {finalRoundName}
            </Badge>
          )}
        </div>
      </div>

      {editMode && (
        <Card className="p-4 mb-5">
          <h3 className="font-semibold text-sm mb-4">Playoffs bearbeiten</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <ImageUploadField
              label="Logo"
              value={editForm.logo}
              onChange={value => setEditForm(prev => ({ ...prev, logo: value }))}
            />

            <ImageUploadField
              label="Banner optional"
              value={editForm.banner}
              onChange={value => setEditForm(prev => ({ ...prev, banner: value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Interner Name
              </label>
              <Input
                value={editForm.name}
                onChange={event => setEditForm(prev => ({ ...prev, name: event.target.value }))}
                placeholder="Playoffssname"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Öffentlicher Anzeigename optional
              </label>
              <Input
                value={editForm.publicName}
                onChange={event => setEditForm(prev => ({ ...prev, publicName: event.target.value }))}
                placeholder="z.B. GFL Playoffs & German Bowl 2026"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Playoffs-Typ
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPETITION_TYPES.map(type => {
                  const active = editForm.competitionType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEditForm(prev => ({
                        ...prev,
                        competitionType: type.value,
                        competitionFormat: isBracketCompetitionType(type.value) ? 'bracket' : 'cards',
                        highlightFinal: isBracketCompetitionType(type.value) ? prev.highlightFinal : false,
                        finalRoundName: isBracketCompetitionType(type.value) ? prev.finalRoundName : '',
                      }))}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? `${type.tone} ring-1 ring-current/30`
                          : 'border-border/50 bg-secondary/20 hover:border-primary/30'
                      }`}
                    >
                      <p className="text-sm font-black">{type.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {isBracketCompetitionType(type.value)
                          ? 'Wird als Turnierbaum angezeigt.'
                          : 'Wird als normale Spielkarten angezeigt.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Select value={editForm.status} onValueChange={value => setEditForm(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status wählen" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status} value={status}>
                    {COMPETITION_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={editForm.season}
              onChange={event => setEditForm(prev => ({ ...prev, season: event.target.value }))}
              placeholder="Season"
            />

            {isBracketCompetitionType(editForm.competitionType) && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finale / Bowl-Name optional
                  </label>
                  <Input
                    value={editForm.finalRoundName}
                    onChange={event => setEditForm(prev => ({ ...prev, finalRoundName: event.target.value }))}
                    placeholder="z.B. German Bowl 2026 oder Gold Bowl"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Bowl ist kein eigener Typ, sondern die letzte Runde dieses Playoff-/Cup-Playoffss.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs font-semibold sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editForm.highlightFinal}
                    onChange={event => setEditForm(prev => ({ ...prev, highlightFinal: event.target.checked }))}
                  />
                  Finale hervorheben / Champion-Animation erlauben
                </label>

                <Input
                  value={editForm.championTitle}
                  onChange={event => setEditForm(prev => ({ ...prev, championTitle: event.target.value }))}
                  placeholder="Champion-Titel"
                />
              </>
            )}

            <Input
              type="date"
              value={editForm.startDate}
              onChange={event => setEditForm(prev => ({ ...prev, startDate: event.target.value }))}
            />

            <Input
              type="date"
              value={editForm.endDate}
              onChange={event => setEditForm(prev => ({ ...prev, endDate: event.target.value }))}
            />

            <Input
              value={editForm.defaultVenue}
              onChange={event => setEditForm(prev => ({ ...prev, defaultVenue: event.target.value }))}
              placeholder="Standard-Spielort"
              className="sm:col-span-2"
            />

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Qualifikation / Modus für Nutzer
              </label>
              <textarea
                value={editForm.qualificationDescription}
                onChange={event => setEditForm(prev => ({ ...prev, qualificationDescription: event.target.value }))}
                placeholder="z.B. Die besten Teams qualifizieren sich für die Playoffs. Das Finale wird als German Bowl ausgetragen."
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold mb-2">{isBracketCompetitionType(editForm.competitionType) ? 'Rundennamen' : 'Abschnitts-/Spielgruppennamen'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bracket.map(round => (
                <Input
                  key={round.round}
                  value={
                    round.isFinalRound && editForm.finalRoundName
                      ? editForm.finalRoundName
                      : editForm.bracketNames?.[round.round] || ''
                  }
                  onChange={event => {
                    if (round.isFinalRound && editForm.finalRoundName) {
                      setEditForm(prev => ({ ...prev, finalRoundName: event.target.value }));
                      return;
                    }

                    setEditForm(prev => ({
                      ...prev,
                      bracketNames: {
                        ...(prev.bracketNames || {}),
                        [round.round]: event.target.value,
                      },
                    }));
                  }}
                  placeholder={`Runde ${round.round}`}
                  className="h-9 text-xs"
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSaveCompetition} disabled={updateCompetitionMutation.isPending} className="w-full mt-4">
            <Save className="w-4 h-4 mr-2" />
            Änderungen speichern
          </Button>
        </Card>
      )}

      <Card className="p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1">Automatische Teilnehmer</h3>
            <p className="text-xs text-muted-foreground">
              {isBracketMode ? 'Teams werden aus den im Bracket gespeicherten Tabellen-Quellen übernommen. Zurückgezogene Teams werden dabei automatisch ignoriert.' : 'Playdowns/Relegation werden als Spielkarten geführt. Teilnehmer kannst du direkt über Spieltermine pflegen.'}
            </p>

            <div className="mt-3 rounded-xl border border-border/40 bg-secondary/20 p-3">
              {!isBracketMode ? (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Kein Turnierbaum: Spiele werden normal als Karten angezeigt und bleiben beim Heimteam-Stadion, sofern du keinen Ort am Spiel setzt.</p>
                </div>
              ) : regularSeasonComplete ? (
                <div className="space-y-3">
                  <p className="text-xs text-green-400">
                    Regular Season abgeschlossen. Teams können jetzt in vorhandene Spieltermine übernommen werden.
                  </p>

                  <Button
                    size="sm"
                    onClick={handleAutoFillGames}
                    disabled={autoProcessing}
                    className="h-8 text-xs"
                  >
                    {autoProcessing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1" />}
                    Teams übernehmen
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 text-xs text-yellow-400">
                  <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Teams bleiben offen, bis alle Regular-Season-Spiele der Liga auf Final stehen.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 mb-5">
        <div className="mb-3">
          <h3 className="font-semibold text-sm">{isBracketMode ? 'Turnierbaum / automatische Spiele' : 'Spielkarten / automatische Spiele'}</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            Jede Runde und jedes Matchup erzeugt automatisch ein Spiel. Datum, Uhrzeit und Teams kannst du danach am Spiel pflegen.
          </p>
        </div>

        {!isBracketMode ? (
          <div className="rounded-2xl border border-border/40 bg-secondary/20 p-4">
            <p className="text-sm font-bold">Spielkarten-Modus</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Für Playdowns und Relegation wird kein Turnierbaum angezeigt. Lege die benötigten Spiele einfach als Termine an.
            </p>
          </div>
        ) : bracket.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Noch kein Playoffssbaum vorhanden.
          </p>
        ) : (
          <div className="space-y-4">
            {bracket.map(round => (
              <div
                key={round.round}
                className={`rounded-2xl border p-3 ${
                  round.isFinalRound && round.highlightFinal
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/40 bg-secondary/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold">{round.name}</h4>
                  <Badge
                    variant={round.isFinalRound && round.highlightFinal ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {round.isFinalRound && finalRoundName ? 'Finale' : `Runde ${round.round}`}
                  </Badge>
                </div>

                <p className="text-[10px] text-muted-foreground mb-3">
                  Spielort: {round.venueMode === 'fixed'
                    ? (round.venue || round.roundVenue || 'Festes Rundenstadion')
                    : round.venueMode === 'manual'
                    ? 'Pro Spiel manuell'
                    : 'Heimteam-Stadion'}
                </p>

                <div className="space-y-2">
                  {(round.matchups || []).map((matchup, index) => {
                    const normalizedMatchup = {
                      ...matchup,
                      matchupIndex: matchup.matchupIndex ?? index,
                      round: round.round,
                      roundName: round.name,
                    };

                    const existingGame = getMatchupGame(round, normalizedMatchup);

                    return (
                      <div key={`${round.round}-${normalizedMatchup.matchupIndex}`} className="rounded-xl border border-border/40 bg-card p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold">
                              {getTeamName(teams, normalizedMatchup.team1Id, normalizedMatchup.team1Placeholder)}
                              <span className="text-muted-foreground mx-2">vs</span>
                              {getTeamName(teams, normalizedMatchup.team2Id, normalizedMatchup.team2Placeholder)}
                            </div>

                            <p className="text-[11px] text-muted-foreground mt-1">
                              {existingGame
                                ? `Termin: ${existingGame.date || 'ohne Datum'} ${existingGame.time || 'ohne Uhrzeit'}`
                                : `${getSourceLabel(normalizedMatchup.team1Source)} vs ${getSourceLabel(normalizedMatchup.team2Source)}`}
                            </p>
                          </div>

                          <Badge variant="outline" className="text-[10px]">
                            {existingGame
                              ? STATUS_LABELS[existingGame.status] || existingGame.status
                              : 'Wird beim Speichern erstellt'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showGameForm && (
        <Card className="p-4 mb-5">
          <h3 className="font-semibold text-sm mb-3">
            {selectedMatchup ? 'Spieltermin aus Matchup anlegen' : 'Freien Spieltermin anlegen'}
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={gameFormData.homeTeamId} onValueChange={value => setGameFormData(prev => ({ ...prev, homeTeamId: value }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Heimteam optional" />
                </SelectTrigger>
                <SelectContent>
                  {leagueTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={gameFormData.awayTeamId} onValueChange={value => setGameFormData(prev => ({ ...prev, awayTeamId: value }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Gastteam optional" />
                </SelectTrigger>
                <SelectContent>
                  {leagueTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={gameFormData.date}
                onChange={event => setGameFormData(prev => ({ ...prev, date: event.target.value }))}
                className="h-9 text-xs"
              />

              <Input
                type="time"
                value={gameFormData.time}
                onChange={event => setGameFormData(prev => ({ ...prev, time: event.target.value }))}
                className="h-9 text-xs"
              />

              <Input
                placeholder="Austragungsort optional"
                value={gameFormData.venue}
                onChange={event => setGameFormData(prev => ({ ...prev, venue: event.target.value }))}
                className="h-9 text-xs sm:col-span-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 h-9 text-xs"
                onClick={() => createGameMutation.mutate(gameFormData)}
                disabled={createGameMutation.isPending}
              >
                {createGameMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Termin speichern'}
              </Button>

              <Button
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={() => {
                  setShowGameForm(false);
                  setSelectedMatchup(null);
                }}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">
          Erstellte Spieltermine ({competitionGames.length})
        </h3>

        <div className="space-y-2">
          {competitionGames.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Keine Spieltermine erstellt.
            </p>
          ) : (
            competitionGames.map(game => (
              <div key={game.id} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {getTeamName(teams, game.homeTeamId, game.homeTeamPlaceholder)}
                        <span className="text-muted-foreground mx-2">vs</span>
                        {getTeamName(teams, game.awayTeamId, game.awayTeamPlaceholder)}
                      </span>

                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {STATUS_LABELS[game.status] || game.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {game.date || 'ohne Datum'} {game.time || 'ohne Uhrzeit'}
                      </span>

                      {game.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {game.venue}
                        </span>
                      )}

                      {game.roundName && <span>{game.roundName}</span>}
                    </div>
                  </div>

                  <Button
                    onClick={() => deleteGameMutation.mutate(game.id)}
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-destructive hover:bg-destructive/10 flex-shrink-0"
                    disabled={deleteGameMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
