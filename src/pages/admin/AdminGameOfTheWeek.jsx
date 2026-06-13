import React, { useMemo, useState } from 'react';
import useSetHeader from '@/hooks/useSetHeader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, CheckCircle2, Loader2, MapPin, Search, Star, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import InternalAccessCards from '@/components/admin/InternalAccessCards';

const STATUS_LABELS = {
  scheduled: 'Geplant',
  live: 'Live',
  final: 'Final',
  cancelled: 'Abgesagt',
};

function getTeamName(team, placeholder) {
  return team?.shortName || team?.name || placeholder || 'TBD';
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Geplant';
}

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;

  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

function getGameDate(game) {
  if (!game?.date) return null;

  const [year, month, day] = String(game.date).split('-').map(Number);
  const [hour, minute] = String(game.time || game.kickoffTime || '00:00').split(':').map(Number);

  if (!year || !month || !day) return null;

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

function hasPlayableScore(game) {
  return (
    game?.scoreHome !== undefined &&
    game?.scoreAway !== undefined &&
    game?.scoreHome !== null &&
    game?.scoreAway !== null &&
    game?.scoreHome !== '' &&
    game?.scoreAway !== '' &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

function getEffectiveStatus(game) {
  const rawStatus = String(game?.status || 'scheduled').toLowerCase();
  const kickoff = getGameDate(game);

  if (kickoff && kickoff.getTime() > Date.now() && rawStatus !== 'cancelled') {
    return 'scheduled';
  }

  if (rawStatus === 'final' && !hasPlayableScore(game)) return 'scheduled';
  return rawStatus;
}

function formatDate(date) {
  if (!date) return 'ohne Datum';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isUpcomingOrToday(game) {
  const gameDate = getGameDate(game);
  if (!gameDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return gameDate >= today;
}

function GameCard({ game, teamsMap, leaguesMap, selected, selecting, onSelect }) {
  const home = teamsMap.get(game.homeTeamId);
  const away = teamsMap.get(game.awayTeamId);
  const league = leaguesMap.get(game.leagueId);

  const homeName = getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder);
  const status = getEffectiveStatus(game);
  const showScore = status === 'live' || status === 'final';

  return (
    <Card className={`p-4 border ${selected ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">
            {league?.shortName || league?.name || 'Keine Liga'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatDate(game.date)} · {game.time || game.kickoffTime || 'ohne Uhrzeit'}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0">
          {selected && (
            <Badge className="border-0 bg-primary text-primary-foreground text-[10px]">
              Aktuell ausgewählt
            </Badge>
          )}

          <Badge
            className={`border-0 text-[10px] ${
              status === 'live'
                ? 'bg-red-500/15 text-red-500'
                : status === 'final'
                ? 'bg-green-500/15 text-green-500'
                : status === 'cancelled'
                ? 'bg-orange-500/15 text-orange-500'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {getStatusLabel(status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <p className="text-sm font-black truncate">
          {homeName}
        </p>

        <div className="min-w-[74px] text-center">
          {showScore ? (
            <p className="text-xl font-black">
              {game.scoreHome ?? 0}:{game.scoreAway ?? 0}
            </p>
          ) : (
            <p className="text-xs font-black text-muted-foreground">
              VS
            </p>
          )}
        </div>

        <p className="text-sm font-black truncate text-right">
          {awayName}
        </p>
      </div>

      {(game.venue || game.city || game.roundName || selected) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {(game.venue || game.city) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[game.venue, game.city].filter(Boolean).join(', ')}
            </span>
          )}

          {game.roundName && <span>{game.roundName}</span>}

          {selected && (
            <span className="font-bold text-primary">
              {game.gameOfTheWeekLabel || 'Game of the Week'}
            </span>
          )}
        </div>
      )}

      <Button
        type="button"
        onClick={() => onSelect(game)}
        disabled={selecting || status === 'cancelled'}
        variant={selected ? 'outline' : 'default'}
        className="mt-4 w-full"
      >
        {selecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : selected ? (
          <X className="mr-2 h-4 w-4" />
        ) : (
          <Star className="mr-2 h-4 w-4" />
        )}
        {selected ? 'Auswahl entfernen' : 'Als Game of the Week setzen'}
      </Button>
    </Card>
  );
}

export default function AdminGameOfTheWeek() {
  useSetHeader({
    mode: 'dashboard',
    title: 'Game of the Week',
  });

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('by The Yardline');
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(true);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-game-of-the-week-games'],
    queryFn: () => base44.entities.Game.list('-date', 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['admin-game-of-the-week-teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['admin-game-of-the-week-leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const teamsMap = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  const leaguesMap = useMemo(() => new Map(leagues.map(league => [league.id, league])), [leagues]);

  const currentSelection = useMemo(() => {
    return [...games]
      .filter(game => game.isGameOfTheWeek === true)
      .sort((a, b) => {
        const selectedA = new Date(a.gameOfTheWeekSelectedAtUtc || 0).getTime();
        const selectedB = new Date(b.gameOfTheWeekSelectedAtUtc || 0).getTime();
        return selectedB - selectedA;
      })[0] || null;
  }, [games]);

  const filteredGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...games]
      .filter(game => game.status !== 'cancelled')
      .filter(game => !showOnlyUpcoming || isUpcomingOrToday(game) || game.isGameOfTheWeek === true)
      .filter(game => {
        if (!normalizedSearch) return true;

        const home = teamsMap.get(game.homeTeamId);
        const away = teamsMap.get(game.awayTeamId);
        const league = leaguesMap.get(game.leagueId);
        const haystack = [
          getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder),
          getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder),
          league?.name,
          league?.shortName,
          game.roundName,
          game.venue,
          game.city,
          game.date,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.isGameOfTheWeek === true && b.isGameOfTheWeek !== true) return -1;
        if (b.isGameOfTheWeek === true && a.isGameOfTheWeek !== true) return 1;

        const dateA = getGameDate(a)?.getTime() || 0;
        const dateB = getGameDate(b)?.getTime() || 0;
        return dateA - dateB;
      });
  }, [games, leaguesMap, search, showOnlyUpcoming, teamsMap]);

  const invalidate = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-game-of-the-week-games'] }),
      queryClient.invalidateQueries({ queryKey: ['game-of-week-selected'] }),
      queryClient.invalidateQueries({ queryKey: ['games'] }),
      queryClient.invalidateQueries({ queryKey: ['editor-games'] }),
    ]);
  };

  const selectMutation = useMutation({
    mutationFn: async game => {
      if (!game?.id) return;

      const now = new Date().toISOString();
      let selectedGames = [];

      try {
        selectedGames = await base44.entities.Game.filter({ isGameOfTheWeek: true });
      } catch (error) {
        console.warn('ADMIN GAME OF THE WEEK SELECTED FILTER FALLBACK:', error);
        selectedGames = games.filter(item => item.isGameOfTheWeek === true);
      }

      const selectedIds = new Set(selectedGames.map(item => item.id));
      const isAlreadySelected = selectedIds.has(game.id) || game.isGameOfTheWeek === true;

      if (isAlreadySelected) {
        await base44.entities.Game.update(game.id, {
          isGameOfTheWeek: false,
          gameOfTheWeekLabel: '',
          gameOfTheWeekSelectedBy: null,
          gameOfTheWeekSelectedAtUtc: null,
          updatedAtUtc: now,
        });
        return 'removed';
      }

      await Promise.all(
        selectedGames
          .filter(item => item.id !== game.id)
          .map(item =>
          base44.entities.Game.update(item.id, {
            isGameOfTheWeek: false,
            gameOfTheWeekLabel: '',
            gameOfTheWeekSelectedBy: null,
            gameOfTheWeekSelectedAtUtc: null,
            updatedAtUtc: now,
          })
        )
      );

      await base44.entities.Game.update(game.id, {
        isGameOfTheWeek: true,
        gameOfTheWeekLabel: label.trim() || 'by The Yardline',
        gameOfTheWeekSelectedBy: null,
        gameOfTheWeekSelectedAtUtc: now,
        updatedAtUtc: now,
      });

      return 'selected';
    },
    onSuccess: async result => {
      await invalidate();
      toast.success(result === 'removed' ? 'Game of the Week entfernt' : 'Game of the Week aktualisiert');
    },
    onError: error => {
      const message = getErrorMessage(error, 'Game of the Week konnte nicht gespeichert werden');
      console.error('ADMIN GAME OF THE WEEK ERROR:', message, error);
      toast.error(message);
    },
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-6 pb-24">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
          Admin Auswahl
        </p>
        <h1 className="mt-1 text-2xl font-black leading-tight">
          Game of the Week
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Wähle ein Spiel aus. Wenn du ein neues Spiel setzt, wird jede alte Auswahl automatisch abgewählt.
        </p>
      </div>

      <InternalAccessCards currentKey="gotw" className="mb-5" />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
        <Card className="p-4 md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Anzeige-Text</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dieser Text steht später beim Game of the Week auf der Startseite.
              </p>
              <Input
                value={label}
                onChange={event => setLabel(event.target.value)}
                className="mt-3"
                placeholder="z.B. by The Yardline"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-500/10">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-black">{currentSelection ? 1 : 0}</p>
              <p className="text-xs font-semibold text-muted-foreground">Aktuelle Auswahl</p>
            </div>
          </div>
        </Card>
      </div>

      {currentSelection && (
        <Card className="mb-4 border-primary/25 bg-primary/5 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Aktuell ausgewählt
          </p>
          <p className="mt-1 text-base font-black">
            {getTeamName(teamsMap.get(currentSelection.homeTeamId), currentSelection.homeTeamNameSnapshot || currentSelection.homeTeamPlaceholder)}
            {' vs '}
            {getTeamName(teamsMap.get(currentSelection.awayTeamId), currentSelection.awayTeamNameSnapshot || currentSelection.awayTeamPlaceholder)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(currentSelection.date)} · {currentSelection.time || currentSelection.kickoffTime || 'ohne Uhrzeit'} · {currentSelection.gameOfTheWeekLabel || 'Game of the Week'}
          </p>
        </Card>
      )}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Spiel, Liga, Team oder Ort suchen"
              className="pl-9"
            />
          </div>

          <Button
            type="button"
            variant={showOnlyUpcoming ? 'default' : 'outline'}
            onClick={() => setShowOnlyUpcoming(value => !value)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {showOnlyUpcoming ? 'Kommende Spiele' : 'Alle Spiele'}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredGames.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Keine Spiele gefunden.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredGames.map(game => (
            <GameCard
              key={game.id}
              game={game}
              teamsMap={teamsMap}
              leaguesMap={leaguesMap}
              selected={game.isGameOfTheWeek === true}
              selecting={selectMutation.isPending}
              onSelect={selectedGame => selectMutation.mutate(selectedGame)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Beim Auswählen eines neuen Spiels wird die alte Game-of-the-Week-Auswahl automatisch entfernt.
          </p>
        </div>
      </div>
    </div>
  );
}
