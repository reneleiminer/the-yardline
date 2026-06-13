import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';

const SYSTEM_AUTHOR_USERNAME = 'yardline-system';

function TeamLogo({ team }) {
  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt=""
        className="w-12 h-12 object-contain rounded-lg bg-secondary/40 border border-border/40"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
      <Shield className="w-6 h-6 text-muted-foreground" />
    </div>
  );
}

function getTeamName(team, placeholder, fallback) {
  return team?.shortName || team?.name || placeholder || fallback;
}

function getTeamDisplay(team, placeholder) {
  return team?.shortName || team?.name || placeholder || 'Teilnehmer offen';
}

async function loadGameById(gameId) {
  if (!gameId) return null;

  try {
    const filtered = await base44.entities.Game.filter({ id: gameId });
    if (filtered?.[0]) return filtered[0];
  } catch (error) {
    console.warn('Game filter failed:', error);
  }

  const games = await base44.entities.Game.list('-date', 1000);
  return games.find(game => game.id === gameId) || null;
}

function getGameReportText({ game, homeTeam, awayTeam, league }) {
  const homeName = getTeamDisplay(homeTeam, game.homeTeamPlaceholder);
  const awayName = getTeamDisplay(awayTeam, game.awayTeamPlaceholder);
  const homeScore = Number(game.scoreHome || 0);
  const awayScore = Number(game.scoreAway || 0);
  const diff = Math.abs(homeScore - awayScore);
  const score = `${homeScore}:${awayScore}`;
  const place = game.venue || game.city || '';
  const leagueLine = league?.shortName || league?.name || '';

  if (homeScore === awayScore) {
    return {
      variant: 'draw',
      title: `${homeName} und ${awayName} trennen sich ${score}`,
      text: [
        `${homeName} und ${awayName} trennen sich ${score}.`,
        place ? `Final in ${place}.` : '',
        leagueLine,
      ].filter(Boolean).join('\n'),
    };
  }

  const winner = homeScore > awayScore ? homeName : awayName;
  const loser = homeScore > awayScore ? awayName : homeName;

  if (diff <= 3) {
    return {
      variant: 'close',
      title: `${winner} gewinnen knapp gegen ${loser}`,
      text: [
        `${winner} setzen sich knapp mit ${score} gegen ${loser} durch.`,
        place ? `Final in ${place}.` : '',
        leagueLine,
      ].filter(Boolean).join('\n'),
    };
  }

  if (diff >= 28) {
    return {
      variant: 'dominant',
      title: `${winner} dominieren gegen ${loser}`,
      text: [
        `${winner} dominieren ${loser} und gewinnen mit ${score}.`,
        place ? `Final in ${place}.` : '',
        leagueLine,
      ].filter(Boolean).join('\n'),
    };
  }

  if (diff >= 17) {
    return {
      variant: 'clear',
      title: `${winner} gewinnen deutlich gegen ${loser}`,
      text: [
        `${winner} gewinnen deutlich mit ${score} gegen ${loser}.`,
        place ? `Final in ${place}.` : '',
        leagueLine,
      ].filter(Boolean).join('\n'),
    };
  }

  return {
    variant: 'normal',
    title: `${winner} gewinnen gegen ${loser}`,
    text: [
      `${winner} gewinnen mit ${score} gegen ${loser}.`,
      place ? `Final in ${place}.` : '',
      leagueLine,
    ].filter(Boolean).join('\n'),
  };
}

async function getGameReportAuthor() {
  try {
    const existing = await base44.entities.AppUser.filter({
      username: SYSTEM_AUTHOR_USERNAME,
    });

    if (existing?.[0]) return existing[0];

    return await base44.entities.AppUser.create({
      username: SYSTEM_AUTHOR_USERNAME,
      displayName: 'The Yardline System',
      avatar: '',
      bio: 'Automatische Spielberichte und Systemmeldungen von The Yardline.',
      role: 'System',
      roleSlug: 'system',
      verified: true,
      status: 'active',
      isSystemAccount: true,
      locked: true,
      canLogin: false,
      canBeEdited: false,
      canBeDeleted: false,
      canBeFollowed: false,
      createdBySystem: true,
    });
  } catch (error) {
    console.warn('Could not load system game report author:', error);

    return {
      id: 'system_game_reports',
      username: SYSTEM_AUTHOR_USERNAME,
      displayName: 'The Yardline System',
      avatar: '',
      verified: true,
      role: 'System',
      roleSlug: 'system',
    };
  }
}

async function createOrUpdateGameReport() {
  // Auto Game Reports wurden bewusst deaktiviert.
  // Ergebnisse sollen nicht mehr als Community-Beiträge vom Yardline-System erstellt werden.
  return null;
}

function sourceMatchesGame(source, roundNumber, matchupIndex) {
  if (!source || source.type !== 'winner') return false;

  const sourceRound = Number(source.round);
  const sourceMatchupIndex = Number(source.matchupIndex ?? source.game ?? 0);

  return sourceRound === roundNumber && sourceMatchupIndex === matchupIndex;
}

function getCompetitionType(competition) {
  return String(
    competition?.type ||
    competition?.competitionType ||
    ''
  ).toLowerCase();
}

function isBracketCompetition(competition) {
  const type = getCompetitionType(competition);

  if (['playdowns', 'relegation', 'promotion'].includes(type)) {
    return false;
  }

  return (
    type === 'playoffs' ||
    type === 'cup' ||
    type === 'tournament' ||
    String(competition?.competitionFormat || competition?.format || competition?.system || '').toLowerCase() === 'bracket'
  );
}

function isFinalRoundGame(bracket, roundNumber) {
  if (!Array.isArray(bracket) || bracket.length === 0) return false;

  const roundNumbers = bracket
    .map(round => Number(round.round || 0))
    .filter(value => Number.isFinite(value));

  if (roundNumbers.length === 0) return false;

  return roundNumber === Math.max(...roundNumbers);
}

async function advanceCompetitionBracketFromFinalGame(game) {
  const competitionId = game?.competitionId || game?.tournamentId;

  if (!competitionId || game.status !== 'final') {
    return { advanced: false, championCompleted: false, reason: 'not_final_or_no_competition' };
  }

  if (game.round === null || game.round === undefined) {
    return { advanced: false, championCompleted: false, reason: 'missing_round' };
  }

  if (game.matchupIndex === null || game.matchupIndex === undefined) {
    return { advanced: false, championCompleted: false, reason: 'missing_matchup_index' };
  }

  const homeScore = Number(game.scoreHome || 0);
  const awayScore = Number(game.scoreAway || 0);

  if (homeScore === awayScore) {
    return { advanced: false, championCompleted: false, reason: 'draw' };
  }

  const winnerId = homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
  if (!winnerId) {
    return { advanced: false, championCompleted: false, reason: 'missing_winner' };
  }

  const tournaments = await base44.entities.Tournament.filter({ id: competitionId });
  const tournament = tournaments?.[0];

  if (!tournament) {
    return { advanced: false, championCompleted: false, reason: 'competition_not_found' };
  }

  if (!isBracketCompetition(tournament)) {
    return { advanced: false, championCompleted: false, reason: 'not_bracket_competition' };
  }

  const bracket = tournament.bracket || tournament.brackets || [];
  const roundNumber = Number(game.round);
  const matchupIndex = Number(game.matchupIndex);
  const isFinalRound = isFinalRoundGame(bracket, roundNumber);

  let changed = false;
  let advancedToNextRound = false;

  const updatedBracket = bracket.map(round => ({
    ...round,
    matchups: (round.matchups || []).map((matchup, index) => {
      const currentMatchupIndex = Number(matchup.matchupIndex ?? index);
      const isCurrentGame =
        Number(round.round) === roundNumber &&
        currentMatchupIndex === matchupIndex;

      if (isCurrentGame) {
        changed = true;

        return {
          ...matchup,
          matchupIndex: currentMatchupIndex,
          winnerId,
          score1: homeScore,
          score2: awayScore,
          gameId: game.id,
          status: 'final',
          completedAtUtc: new Date().toISOString(),
        };
      }

      let nextMatchup = {
        ...matchup,
        matchupIndex: currentMatchupIndex,
      };

      if (sourceMatchesGame(nextMatchup.team1Source, roundNumber, matchupIndex)) {
        nextMatchup = {
          ...nextMatchup,
          team1Id: winnerId,
          team1Placeholder: 'Sieger',
        };
        changed = true;
        advancedToNextRound = true;
      }

      if (sourceMatchesGame(nextMatchup.team2Source, roundNumber, matchupIndex)) {
        nextMatchup = {
          ...nextMatchup,
          team2Id: winnerId,
          team2Placeholder: 'Sieger',
        };
        changed = true;
        advancedToNextRound = true;
      }

      return nextMatchup;
    }),
  }));

  if (!changed) {
    return { advanced: false, championCompleted: false, reason: 'no_bracket_change' };
  }

  const allGames = await base44.entities.Game.list('-date', 1000);
  const competitionGames = allGames.filter(item =>
    item.competitionId === competitionId ||
    item.tournamentId === competitionId
  );

  const gameUpdates = [];

  updatedBracket.forEach(round => {
    (round.matchups || []).forEach(matchup => {
      const existingGame = competitionGames.find(item =>
        Number(item.round) === Number(round.round) &&
        Number(item.matchupIndex) === Number(matchup.matchupIndex)
      );

      if (!existingGame) return;

      const homeTeamId = matchup.team1Id || existingGame.homeTeamId || '';
      const awayTeamId = matchup.team2Id || existingGame.awayTeamId || '';

      const nextPayload = {
        homeTeamId,
        awayTeamId,
        homeTeamPlaceholder: matchup.team1Placeholder || existingGame.homeTeamPlaceholder || 'Teilnehmer offen',
        awayTeamPlaceholder: matchup.team2Placeholder || existingGame.awayTeamPlaceholder || 'Teilnehmer offen',
        teamsResolved: !!homeTeamId && !!awayTeamId,
      };

      const hasChanged =
        existingGame.homeTeamId !== nextPayload.homeTeamId ||
        existingGame.awayTeamId !== nextPayload.awayTeamId ||
        existingGame.homeTeamPlaceholder !== nextPayload.homeTeamPlaceholder ||
        existingGame.awayTeamPlaceholder !== nextPayload.awayTeamPlaceholder ||
        existingGame.teamsResolved !== nextPayload.teamsResolved;

      if (hasChanged) {
        gameUpdates.push(base44.entities.Game.update(existingGame.id, nextPayload));
      }
    });
  });

  await Promise.all(gameUpdates);

  const tournamentPayload = {
    bracket: updatedBracket,
    brackets: updatedBracket,
    updatedAtUtc: new Date().toISOString(),
  };

  if (isFinalRound) {
    tournamentPayload.status = 'completed';
    tournamentPayload.championTeamId = winnerId;
    tournamentPayload.championId = winnerId;
    tournamentPayload.championGameId = game.id;
    tournamentPayload.championCompletedAtUtc = new Date().toISOString();
  }

  await base44.entities.Tournament.update(competitionId, tournamentPayload);

  return {
    advanced: advancedToNextRound,
    championCompleted: isFinalRound,
    winnerId,
  };
}

export default function AdminGameResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useSetHeader({
  mode: 'back',
  title: 'Ergebnis eintragen',
  backTo: '/admin',
});

  const gameId = searchParams.get('gameId');

  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  const [resultStatus, setResultStatus] = useState('live');

  const { data: game, isLoading } = useQuery({
    queryKey: ['game-result', gameId],
    queryFn: () => loadGameById(gameId),
    enabled: !!gameId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('name'),
  });

  const teamMap = useMemo(() => {
    return Object.fromEntries(teams.map(team => [team.id, team]));
  }, [teams]);

  const leagueMap = useMemo(() => {
    return Object.fromEntries(leagues.map(league => [league.id, league]));
  }, [leagues]);

  const homeTeam = game?.homeTeamId ? teamMap[game.homeTeamId] : null;
  const awayTeam = game?.awayTeamId ? teamMap[game.awayTeamId] : null;
  const league = game?.leagueId ? leagueMap[game.leagueId] : null;

  useEffect(() => {
    if (!game) return;

    setHomeScore(String(game.scoreHome ?? 0));
    setAwayScore(String(game.scoreAway ?? 0));
    setResultStatus(game.status === 'final' ? 'final' : 'live');
  }, [game]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const nextHomeScore = Number.parseInt(homeScore, 10);
      const nextAwayScore = Number.parseInt(awayScore, 10);
      const isFinal = resultStatus === 'final';

      const payload = {
        scoreHome: Number.isNaN(nextHomeScore) ? 0 : nextHomeScore,
        scoreAway: Number.isNaN(nextAwayScore) ? 0 : nextAwayScore,
        status: resultStatus,
        finalizedAt: isFinal ? new Date().toISOString() : '',
      };

      const updatedGame = await base44.entities.Game.update(game.id, payload);

      const nextGame = {
        ...game,
        ...payload,
        ...updatedGame,
      };

      if (isFinal) {
        await createOrUpdateGameReport({
          game: nextGame,
          homeTeam,
          awayTeam,
          league,
        });

        const advanceInfo = await advanceCompetitionBracketFromFinalGame(nextGame);

        return {
          nextGame,
          advanceInfo,
        };
      }

      return {
        nextGame,
        advanceInfo: null,
      };
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['today-games-reminder'] });
      queryClient.invalidateQueries({ queryKey: ['game-result', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game-content', gameId] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      queryClient.invalidateQueries({ queryKey: ['adminCompetitions'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });

      const advanceInfo = result?.advanceInfo;

      toast.success(
        resultStatus === 'final'
          ? advanceInfo?.championCompleted
            ? 'Finales Ergebnis gespeichert und Champion gesetzt'
            : advanceInfo?.advanced
            ? 'Finales Ergebnis gespeichert und Gewinner weitergetragen'
            : 'Finales Ergebnis gespeichert'
          : 'Live-Ergebnis gespeichert'
      );

      navigate('/admin');
    },
    onError: error => {
      console.error('SAVE RESULT ERROR:', error);
      toast.error(error.message || 'Ergebnis konnte nicht gespeichert werden');
    },
  });

  const handleSubmit = event => {
    event.preventDefault();

    if (!game) {
      toast.error('Spiel nicht gefunden');
      return;
    }

    updateMutation.mutate();
  };

  if (!gameId) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Kein Spiel ausgewählt.
        </p>
        <Button onClick={() => navigate('/admin')}>
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-semibold mb-1">Spiel nicht gefunden</p>
        <p className="text-xs text-muted-foreground mb-4">
          ID: {gameId}
        </p>
        <Button onClick={() => navigate('/admin')}>
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 py-6 pb-24 max-w-sm mx-auto">
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <TeamLogo team={homeTeam} />
            <span className="text-xs font-semibold text-center truncate w-full">
              {getTeamName(homeTeam, game.homeTeamPlaceholder, 'Heimteam')}
            </span>
          </div>

          <span className="text-sm text-muted-foreground flex-shrink-0">
            vs
          </span>

          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <TeamLogo team={awayTeam} />
            <span className="text-xs font-semibold text-center truncate w-full">
              {getTeamName(awayTeam, game.awayTeamPlaceholder, 'Gastteam')}
            </span>
          </div>
        </div>

        {(game.date || game.time) && (
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            {[game.date, game.time].filter(Boolean).join(' · ')}
          </p>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {getTeamName(homeTeam, game.homeTeamPlaceholder, 'Heim')}
            </label>
            <Input
              type="number"
              min="0"
              max="999"
              value={homeScore}
              onChange={event => setHomeScore(event.target.value)}
              className="text-2xl font-black text-center py-3"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {getTeamName(awayTeam, game.awayTeamPlaceholder, 'Gast')}
            </label>
            <Input
              type="number"
              min="0"
              max="999"
              value={awayScore}
              onChange={event => setAwayScore(event.target.value)}
              className="text-2xl font-black text-center py-3"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Status
          </label>
          <Select value={resultStatus} onValueChange={setResultStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin')}
            className="flex-1"
            disabled={updateMutation.isPending}
          >
            Abbrechen
          </Button>

          <Button
            type="submit"
            className="flex-1"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : resultStatus === 'final' ? (
              'Final speichern'
            ) : (
              'Live speichern'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
