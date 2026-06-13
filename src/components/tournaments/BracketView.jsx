import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Shield,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';
import { useGlobalData } from '@/lib/GlobalDataContext';

const STATUS_LABELS = {
  upcoming: 'Geplant',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
  scheduled: 'Geplant',
  live: 'Live',
  final: 'Final',
};

const DEFAULT_DISPLAY_SETTINGS = {
  showLeague: true,
  showSeason: true,
  showStatus: true,
  showBracketStats: true,
};

const BRACKET_CARD_HEIGHT = 122;
const BRACKET_BASE_GAP = 14;
const BRACKET_CARD_WIDTH = 224;
const BRACKET_CONNECTOR_INSET = 14;
const BRACKET_SECTION_WIDTH = 258;

function getRoundLayout(roundIndex = 0) {
  const multiplier = Math.max(1, 2 ** roundIndex);
  const topOffset = roundIndex === 0
    ? 0
    : ((multiplier - 1) * (BRACKET_CARD_HEIGHT + BRACKET_BASE_GAP)) / 2;

  const rowGap = roundIndex === 0
    ? BRACKET_BASE_GAP
    : ((multiplier - 1) * (BRACKET_CARD_HEIGHT + BRACKET_BASE_GAP)) + BRACKET_BASE_GAP;

  return {
    topOffset,
    rowGap,
  };
}

function getRoundContentHeight(matchCount = 0, roundIndex = 0) {
  if (matchCount <= 0) return BRACKET_CARD_HEIGHT;

  const { topOffset, rowGap } = getRoundLayout(roundIndex);

  return (topOffset * 2) + (matchCount * BRACKET_CARD_HEIGHT) + (Math.max(0, matchCount - 1) * rowGap);
}

const BRACKET_TYPES = ['playoffs', 'cup'];

function sameSeason(game, season) {
  if (!season) return true;
  return !game.season || game.season === season;
}

function getCompetitionType(tournament) {
  return String(tournament?.type || tournament?.competitionType || 'playoffs').toLowerCase();
}

function isBracketCompetition(tournament) {
  return BRACKET_TYPES.includes(getCompetitionType(tournament));
}

function getFinalRoundName(tournament) {
  return (
    tournament?.finalRoundName ||
    tournament?.finalName ||
    tournament?.publicDisplaySettings?.finalRoundName ||
    ''
  );
}

function shouldHighlightFinal(tournament) {
  if (!isBracketCompetition(tournament)) return false;

  if (tournament?.highlightFinal !== undefined) return !!tournament.highlightFinal;

  if (tournament?.publicDisplaySettings?.highlightFinal !== undefined) {
    return !!tournament.publicDisplaySettings.highlightFinal;
  }

  return !!getFinalRoundName(tournament);
}

function getRegularSeasonGames(games = [], leagueId, season) {
  return games.filter(game => {
    if (game.leagueId !== leagueId) return false;
    if (!sameSeason(game, season)) return false;
    if (game.isCompetitionGame || game.competitionId || game.tournamentId) return false;
    return true;
  });
}

function areSeasonGamesFinal(games = [], leagueId, season) {
  const seasonGames = getRegularSeasonGames(games, leagueId, season);

  if (seasonGames.length === 0) return false;

  return seasonGames.every(game => game.status === 'final');
}

function calculateStandings({ league, teams = [], games = [], season }) {
  if (!league?.id) return [];

  const regularSeasonGames = getRegularSeasonGames(games, league.id, season);
  const leagueTeams = teams.filter(team => team.leagueId === league.id);
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

      if (!home || !away) return;

      const homeScore = Number(game.scoreHome || 0);
      const awayScore = Number(game.scoreAway || 0);

      home.played += 1;
      away.played += 1;

      home.pointsFor += homeScore;
      home.pointsAgainst += awayScore;
      away.pointsFor += awayScore;
      away.pointsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.won += 1;
        away.lost += 1;
      } else if (awayScore > homeScore) {
        away.won += 1;
        home.lost += 1;
      } else {
        home.tied += 1;
        away.tied += 1;
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

function resolveTeamIdFromSource({ source, standings, teamsById, canResolveTeams }) {
  if (!canResolveTeams) return null;
  if (!source || source.type !== 'standings') return null;

  const position = Number(source.position || 1);
  const rows = source.scope === 'group'
    ? standings.filter(row => teamsById[row.teamId]?.groupId === source.groupId)
    : standings;

  return rows[position - 1]?.teamId || null;
}

function getWinnerIdFromGame(game, canResolveTeams = true) {
  if (!canResolveTeams) return null;
  if (!game || game.status !== 'final') return null;

  const homeScore = Number(game.scoreHome || 0);
  const awayScore = Number(game.scoreAway || 0);

  if (homeScore === awayScore) return null;

  return homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
}

function getGroupName(groups = [], groupId) {
  const group = (groups || []).find(item => item.id === groupId);

  if (!group) return 'Gruppe';

  const name = group.name || group.shortName || 'Gruppe';

  if (String(name).toLowerCase().startsWith('gruppe')) {
    return name;
  }

  return `Gruppe ${name}`;
}

function getSourceLabel(source, groups = []) {
  if (!source) return 'Teilnehmer offen';

  if (source.type === 'winner') {
    return `Sieger Runde ${source.round || '?'} Spiel ${Number(source.matchupIndex || 0) + 1}`;
  }

  if (source.type === 'manual') {
    return source.label || 'Teilnehmer offen';
  }

  if (source.scope === 'group') {
    return `${getGroupName(groups, source.groupId)} Platz ${source.position || 1}`;
  }

  return `Gesamttabelle Platz ${source.position || 1}`;
}

function getResolvedPlaceholder(existingPlaceholder, source, groups = []) {
  if (source?.scope === 'group') {
    return getSourceLabel(source, groups);
  }

  return existingPlaceholder || getSourceLabel(source, groups);
}

function getGameDate(game) {
  if (!game) return null;

  if (game.date) {
    const rawTime = game.time || game.kickoffTime || '00:00';
    const [year, month, day] = String(game.date).split('-').map(Number);
    const [hour, minute] = String(rawTime).split(':').map(Number);

    if (year && month && day) {
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
  }

  if (game.kickoffAt) {
    const parsed = new Date(game.kickoffAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function formatGameDate(game) {
  const date = getGameDate(game);

  if (!date) return '';

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatGameTime(game) {
  return game?.time || game?.kickoffTime || '';
}

function normalizeRoundMeta({ tournament, round, roundIndex, totalRounds }) {
  const finalRoundName = getFinalRoundName(tournament);
  const highlightFinal = shouldHighlightFinal(tournament);
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

function resolveBracket({ tournament, league, teams = [], games = [], canResolveTeams }) {
  const rawBracket = tournament?.bracket || tournament?.brackets || [];
  const standings = calculateStandings({
    league,
    teams,
    games,
    season: tournament?.season,
  });

  const teamsById = Object.fromEntries(teams.map(team => [team.id, team]));
  const groups = league?.groups || [];

  const competitionGames = games.filter(game =>
    game.competitionId === tournament?.id ||
    game.tournamentId === tournament?.id
  );

  const gamesByRoundMatchup = Object.fromEntries(
    competitionGames.map(game => [
      `${Number(game.round)}_${Number(game.matchupIndex)}`,
      game,
    ])
  );

  return rawBracket.map((rawRound, roundIndex) => {
    const round = normalizeRoundMeta({
      tournament,
      round: rawRound,
      roundIndex,
      totalRounds: rawBracket.length,
    });

    return {
      ...round,
      matchups: (round.matchups || []).map((matchup, index) => {
        const matchupIndex = matchup.matchupIndex ?? index;

        const existingGame = gamesByRoundMatchup[
          `${Number(round.round)}_${Number(matchupIndex)}`
        ];

        const team1FromStandings = resolveTeamIdFromSource({
          source: matchup.team1Source,
          standings,
          teamsById,
          canResolveTeams,
        });

        const team2FromStandings = resolveTeamIdFromSource({
          source: matchup.team2Source,
          standings,
          teamsById,
          canResolveTeams,
        });

        let team1FromWinner = null;
        let team2FromWinner = null;

        if (matchup.team1Source?.type === 'winner') {
          const sourceGame = gamesByRoundMatchup[
            `${Number(matchup.team1Source.round)}_${Number(matchup.team1Source.matchupIndex)}`
          ];

          team1FromWinner = getWinnerIdFromGame(sourceGame, canResolveTeams);
        }

        if (matchup.team2Source?.type === 'winner') {
          const sourceGame = gamesByRoundMatchup[
            `${Number(matchup.team2Source.round)}_${Number(matchup.team2Source.matchupIndex)}`
          ];

          team2FromWinner = getWinnerIdFromGame(sourceGame, canResolveTeams);
        }

        const team1Id = canResolveTeams
          ? existingGame?.homeTeamId || matchup.team1Id || team1FromStandings || team1FromWinner || null
          : null;

        const team2Id = canResolveTeams
          ? existingGame?.awayTeamId || matchup.team2Id || team2FromStandings || team2FromWinner || null
          : null;

        const winnerId =
          matchup.winnerId ||
          getWinnerIdFromGame(existingGame, canResolveTeams) ||
          null;

        return {
          ...matchup,
          game: existingGame || null,
          matchupIndex,
          winnerId,
          team1Id,
          team2Id,
          score1: existingGame?.status === 'final' || existingGame?.status === 'live'
            ? existingGame.scoreHome
            : matchup.score1,
          score2: existingGame?.status === 'final' || existingGame?.status === 'live'
            ? existingGame.scoreAway
            : matchup.score2,
          status: existingGame?.status || matchup.status || 'scheduled',
          team1Placeholder: getResolvedPlaceholder(matchup.team1Placeholder, matchup.team1Source, groups),
          team2Placeholder: getResolvedPlaceholder(matchup.team2Placeholder, matchup.team2Source, groups),
        };
      }),
    };
  });
}

function TeamLogo({ team, fallback, winner }) {
  const size = 'w-6 h-6 rounded-lg';

  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt={team.name || ''}
        className={`${size} object-contain bg-black/45 border ${
          winner ? 'border-emerald-400/60' : 'border-white/10'
        } p-0.5 flex-shrink-0`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${size} bg-black/20 border ${
        winner ? 'border-emerald-400/60 text-emerald-300' : 'border-white/10 text-muted-foreground'
      } flex items-center justify-center text-[9px] font-black flex-shrink-0`}
    >
      {fallback?.[0] || <Shield className="w-3.5 h-3.5" />}
    </div>
  );
}

function TeamLine({ team, name, score, winner, dimmed }) {
  return (
    <div
      className={`grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        winner
          ? 'bg-emerald-400/12 text-white'
          : dimmed
          ? 'bg-black/15 opacity-55'
          : 'bg-black/20'
      }`}
    >
      <TeamLogo
        team={team}
        fallback={name}
        winner={winner}
      />

      <div className="min-w-0">
        <p className="text-[11px] font-black leading-tight truncate">
          {name}
        </p>
      </div>

      {score !== undefined && score !== null && score !== '' && (
        <span
          className={`text-sm font-black tabular-nums ${winner ? 'text-emerald-300' : 'text-muted-foreground'}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  round,
  teamsMap,
  groups = [],
  canResolveTeams,
  competitionGames,
  onOpenGame,
}) {
  const team1 = teamsMap[match.team1Id];
  const team2 = teamsMap[match.team2Id];

  const game = match.game || competitionGames.find(item =>
    Number(item.round) === Number(round.round) &&
    Number(item.matchupIndex) === Number(match.matchupIndex)
  );

  const team1Name =
    team1?.shortName ||
    team1?.name ||
    match.team1Placeholder ||
    getSourceLabel(match.team1Source, groups);

  const team2Name =
    team2?.shortName ||
    team2?.name ||
    match.team2Placeholder ||
    getSourceLabel(match.team2Source, groups);

  const winnerId = match.winnerId || getWinnerIdFromGame(game, canResolveTeams);
  const team1Wins = winnerId && winnerId === match.team1Id;
  const team2Wins = winnerId && winnerId === match.team2Id;
  const isFinished = game?.status === 'final' || !!winnerId;
  const isLive = game?.status === 'live';
  const finalRound = !!round.isFinalRound;
  const canOpen = !!game?.id;

  const date = formatGameDate(game);
  const time = formatGameTime(game);
  return (
    <button
      type="button"
      onClick={() => {
        if (canOpen) onOpenGame(game.id);
      }}
      className={`relative h-[122px] w-full text-left rounded-xl border overflow-hidden transition-all active:scale-[0.99] ${
        finalRound
          ? 'border-emerald-400/35 bg-gradient-to-br from-emerald-500/14 via-slate-950 to-slate-950 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
          : 'border-white/10 bg-slate-950/95 hover:border-primary/35'
      } ${canOpen ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {finalRound && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.22),transparent_36%)]" />
      )}

      <div className="relative z-10 p-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground truncate">
              Spiel {Number(match.matchupIndex || 0) + 1}
            </p>

            {(date || time) && (
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                {[date, time].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isLive && (
              <Badge className="text-[9px] border-0 bg-red-500/15 text-red-400">
                Live
              </Badge>
            )}

            {isFinished && (
              <Badge className="text-[9px] border-0 bg-green-500/15 text-green-400">
                Final
              </Badge>
            )}

            {finalRound && (
              <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-300">
                Finale
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <TeamLine
            team={team1}
            name={team1Name}
            score={match.score1}
            winner={team1Wins}
            dimmed={isFinished && winnerId && !team1Wins}
          />

          <TeamLine
            team={team2}
            name={team2Name}
            score={match.score2}
            winner={team2Wins}
            dimmed={isFinished && winnerId && !team2Wins}
          />
        </div>

        {canOpen && (
          <div className="flex items-center justify-end mt-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-primary flex-shrink-0">
              Details
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function BracketPlaceholder({ canResolveTeams, league }) {
  return (
    <div className="rounded-3xl border border-border/50 bg-card p-5 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
        <Clock className="w-5 h-5 text-primary" />
      </div>

      <h2 className="text-sm font-black">
        Turnierbaum noch nicht bereit
      </h2>

      <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-sm mx-auto">
        {canResolveTeams
          ? 'Der Wettbewerb hat noch keine Runden oder Spiele.'
          : league?.id
          ? 'Die Teilnehmer werden angezeigt, sobald alle relevanten Season-Spiele final sind oder der Admin sie manuell gesetzt hat.'
          : 'Es ist keine Liga verknüpft. Teilnehmer können erst angezeigt werden, wenn sie manuell gesetzt sind.'}
      </p>
    </div>
  );
}

export default function BracketView({ tournament, teams: passedTeams }) {
  const navigate = useNavigate();
  const bracketScrollerRef = useRef(null);

  const {
    teams: globalTeams = [],
    games = [],
    leagues = [],
  } = useGlobalData();

  const teams = passedTeams || globalTeams;

  const display = {
    ...DEFAULT_DISPLAY_SETTINGS,
    ...(tournament?.publicDisplaySettings || {}),
  };

  const league = useMemo(() => {
    return leagues.find(item => item.id === tournament?.leagueId);
  }, [leagues, tournament?.leagueId]);

  const canResolveTeams = useMemo(() => {
    if (!league?.id) return true;

    const bracket = tournament?.bracket || tournament?.brackets || [];
    const hasManualTeams = bracket.some(round =>
      (round.matchups || []).some(matchup => matchup.team1Id || matchup.team2Id)
    );

    if (hasManualTeams) return true;

    return areSeasonGamesFinal(games, league.id, tournament?.season);
  }, [games, league?.id, tournament?.bracket, tournament?.brackets, tournament?.season]);

  const teamsMap = useMemo(() => {
    return Object.fromEntries(teams.map(team => [team.id, team]));
  }, [teams]);

  const competitionGames = useMemo(() => {
    if (!tournament?.id) return [];

    return games.filter(game =>
      game.competitionId === tournament.id ||
      game.tournamentId === tournament.id
    );
  }, [games, tournament?.id]);

  const resolvedBracket = useMemo(() => {
    if (!tournament) return [];

    if (!league) {
      const rawBracket = tournament.bracket || tournament.brackets || [];

      return rawBracket.map((rawRound, roundIndex) => normalizeRoundMeta({
        tournament,
        round: {
          ...rawRound,
          matchups: (rawRound.matchups || []).map((matchup, index) => ({
            ...matchup,
            matchupIndex: matchup.matchupIndex ?? index,
            team1Placeholder: getResolvedPlaceholder(matchup.team1Placeholder, matchup.team1Source, []),
            team2Placeholder: getResolvedPlaceholder(matchup.team2Placeholder, matchup.team2Source, []),
          })),
        },
        roundIndex,
        totalRounds: rawBracket.length,
      }));
    }

    return resolveBracket({
      tournament,
      league,
      teams,
      games,
      canResolveTeams,
    });
  }, [canResolveTeams, games, league, teams, tournament]);

  const rounds = useMemo(() => {
    if (!Array.isArray(resolvedBracket)) return [];
    return [...resolvedBracket].sort((a, b) => (a.round || 0) - (b.round || 0));
  }, [resolvedBracket]);

  const maxRoundHeight = useMemo(() => {
    if (rounds.length === 0) return BRACKET_CARD_HEIGHT;

    return rounds.reduce((maxHeight, round, roundIndex) => {
      const nextHeight = getRoundContentHeight((round.matchups || []).length, roundIndex);
      return Math.max(maxHeight, nextHeight);
    }, BRACKET_CARD_HEIGHT);
  }, [rounds]);

  const activeRoundIndex = useMemo(() => {
    if (rounds.length === 0) return 0;

    const liveRoundIndex = rounds.findIndex(round =>
      (round.matchups || []).some(matchup => matchup.game?.status === 'live')
    );

    if (liveRoundIndex !== -1) return liveRoundIndex;

    const now = Date.now();

    const scheduledCandidates = rounds
      .flatMap((round, roundIndex) =>
        (round.matchups || [])
          .map(matchup => ({
            roundIndex,
            game: matchup.game,
          }))
          .filter(item => {
            if (!item.game) return false;
            if (item.game.status === 'final') return false;

            const date = getGameDate(item.game);
            return date && date.getTime() >= now;
          })
      )
      .sort((a, b) => getGameDate(a.game).getTime() - getGameDate(b.game).getTime());

    if (scheduledCandidates[0]) return scheduledCandidates[0].roundIndex;

    const firstPlayableRoundIndex = rounds.findIndex(round =>
      (round.matchups || []).some(matchup => {
        const hasBothTeams = !!matchup.team1Id && !!matchup.team2Id;
        const hasWinner = !!matchup.winnerId;
        const isFinal = matchup.game?.status === 'final';

        return hasBothTeams && !hasWinner && !isFinal;
      })
    );

    if (firstPlayableRoundIndex !== -1) return firstPlayableRoundIndex;

    const firstOpenPlaceholderRoundIndex = rounds.findIndex(round =>
      (round.matchups || []).some(matchup => !matchup.team1Id || !matchup.team2Id)
    );

    if (firstOpenPlaceholderRoundIndex !== -1) return firstOpenPlaceholderRoundIndex;

    return Math.max(rounds.length - 1, 0);
  }, [rounds]);

  useEffect(() => {
    const scroller = bracketScrollerRef.current;
    if (!scroller) return;

    const roundElement = scroller.querySelector(`[data-round-index="${activeRoundIndex}"]`);
    if (!roundElement) return;

    scroller.scrollLeft = Math.max(0, roundElement.offsetLeft - 16);
  }, [activeRoundIndex]);

  const subtitleParts = [];
  if (display.showLeague) subtitleParts.push(league?.shortName || league?.name || 'Keine Liga');
  if (display.showSeason && tournament?.season) subtitleParts.push(`Season ${tournament.season}`);

  const bracketEnabled = isBracketCompetition(tournament);

  if (!bracketEnabled) {
    return null;
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-white/10 bg-black/45 overflow-hidden">
        <div className="px-3 py-3 border-b border-white/10 bg-slate-950/85">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-primary flex-shrink-0" />

                <h2 className="text-sm font-black truncate">
                  Turnierbaum
                </h2>
              </div>

              {subtitleParts.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {subtitleParts.join(' · ')}
                </p>
              )}
            </div>

            {display.showBracketStats && (
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge variant="secondary" className="text-[10px]">
                  {rounds.length} Runden
                </Badge>

                {display.showStatus && tournament?.status && (
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABELS[tournament.status] || tournament.status}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="p-4">
            <BracketPlaceholder canResolveTeams={canResolveTeams} league={league} />
          </div>
        ) : (
          <div
            ref={bracketScrollerRef}
            className="overflow-x-auto hide-scrollbar snap-x snap-mandatory"
          >
            <div className="flex items-start gap-5 px-3 py-4 min-w-max">
              {rounds.map((roundData, roundIndex) => {
                const isFinalRound = !!roundData.isFinalRound || roundIndex === rounds.length - 1;
                const matchups = roundData.matchups || [];
                const { topOffset, rowGap } = getRoundLayout(roundIndex);

                return (
                  <section
                    key={`${roundData.round}-${roundIndex}`}
                    data-round-index={roundIndex}
                    className="relative snap-start shrink-0"
                    style={{ width: `${BRACKET_SECTION_WIDTH}px` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 px-1">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                          isFinalRound
                            ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/10 bg-white/5 text-muted-foreground'
                        }`}
                      >
                        {isFinalRound && <Trophy className="w-3 h-3" />}
                        {roundData.name || `Runde ${roundData.round}`}
                      </div>

                      <span className="text-[10px] text-muted-foreground">
                        {matchups.length} Spiele
                      </span>
                    </div>

                    <div
                      className="relative"
                      style={{ minHeight: `${maxRoundHeight}px` }}
                    >
                      {matchups.map((match, index) => {
                        const slotTop = topOffset + (index * (BRACKET_CARD_HEIGHT + rowGap));
                        const centerY = slotTop + (BRACKET_CARD_HEIGHT / 2);
                        const isPairStart = index % 2 === 0;
                        const pairMatch = matchups[index + 1];

                        return (
                          <div key={`${roundData.round}-${match.matchupIndex ?? index}`}>
                            <div
                              className="absolute left-0"
                              style={{
                                top: `${slotTop}px`,
                                width: `${BRACKET_CARD_WIDTH}px`,
                              }}
                            >
                              <MatchCard
                                match={match}
                                round={roundData}
                                teamsMap={teamsMap}
                                groups={league?.groups || []}
                                canResolveTeams={canResolveTeams}
                                competitionGames={competitionGames}
                                onOpenGame={(gameId) => navigate(`/game/${gameId}`)}
                              />
                            </div>

                            {!isFinalRound && (
                              <div
                                className="absolute h-px bg-emerald-400/35"
                                style={{
                                  left: `${BRACKET_CARD_WIDTH}px`,
                                  top: `${centerY}px`,
                                  width: `${BRACKET_CONNECTOR_INSET}px`,
                                }}
                              />
                            )}

                            {!isFinalRound && isPairStart && pairMatch && (() => {
                              const pairTop = topOffset + ((index + 1) * (BRACKET_CARD_HEIGHT + rowGap));
                              const pairCenterY = pairTop + (BRACKET_CARD_HEIGHT / 2);
                              const trunkLeft = BRACKET_CARD_WIDTH + BRACKET_CONNECTOR_INSET;
                              const trunkHeight = pairCenterY - centerY;
                              const midpointY = centerY + (trunkHeight / 2);
                              const exitWidth = BRACKET_SECTION_WIDTH - trunkLeft;

                              return (
                                <>
                                  <div
                                    className="absolute w-px bg-emerald-400/35"
                                    style={{
                                      left: `${trunkLeft}px`,
                                      top: `${centerY}px`,
                                      height: `${trunkHeight}px`,
                                    }}
                                  />
                                  <div
                                    className="absolute h-px bg-emerald-400/35"
                                    style={{
                                      left: `${trunkLeft}px`,
                                      top: `${midpointY}px`,
                                      width: `${exitWidth}px`,
                                    }}
                                  />
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
