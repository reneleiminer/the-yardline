import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CalendarDays,
  FileText,
  Loader2,
  MapPin,
  Shield,
  Trophy,
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import useSetHeader from '@/hooks/useSetHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ScoreDisplay from '@/components/ui/ScoreDisplay';
import { getImageUrl } from '@/lib/imageUtils';
import BracketView from '@/components/tournaments/BracketView';
import { getEffectiveGameStatus } from '@/lib/gameStatusUtils';

const PLAYOFF_TYPES = ['playoffs', 'cup'];
const LIST_TYPES = ['playdowns', 'relegation', 'promotion'];

const STATUS_LABELS = {
  upcoming: 'Geplant',
  active: 'Aktiv',
  completed: 'Abgeschlossen',
  inactive: 'Inaktiv',
};

const STATUS_STYLES = {
  upcoming: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  active: 'border-green-500/30 bg-green-500/10 text-green-300',
  completed: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  inactive: 'border-border/60 bg-secondary text-muted-foreground',
};

const GAME_STATUS_LABELS = {
  scheduled: 'Geplant',
  live: 'Live',
  final: 'Final',
};

function normalizeType(competition) {
  return String(
    competition?.competitionType ||
    competition?.type ||
    'playoffs'
  ).toLowerCase();
}

function shouldUseBracket(competition) {
  return PLAYOFF_TYPES.includes(normalizeType(competition));
}

function shouldUseGameList(competition) {
  return LIST_TYPES.includes(normalizeType(competition)) || !shouldUseBracket(competition);
}

function getPublicName(competition) {
  return competition?.publicName || competition?.displayName || competition?.name || 'Wettbewerb';
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'Geplant';
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.upcoming;
}

function getTypeLabel(competition) {
  const type = normalizeType(competition);

  if (type === 'playoffs') return 'Playoffs';
  if (type === 'cup') return 'Cup / Sonderturnier';
  if (type === 'playdowns') return 'Playdowns';
  if (type === 'relegation' || type === 'promotion') return 'Relegation / Aufstieg';

  return 'Wettbewerb';
}

function getFinalRoundName(competition) {
  return (
    competition?.finalRoundName ||
    competition?.finalName ||
    competition?.publicDisplaySettings?.finalRoundName ||
    ''
  );
}

function getQualificationText(competition) {
  return String(
    competition?.qualificationDescription ||
    competition?.description ||
    competition?.publicDescription ||
    competition?.rulesDescription ||
    competition?.qualificationText ||
    competition?.publicDisplaySettings?.qualificationDescription ||
    competition?.publicDisplaySettings?.description ||
    ''
  ).trim();
}

function getGameDate(game) {
  if (game?.date) {
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

  if (game?.kickoffAt) {
    const date = new Date(game.kickoffAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function formatGameDate(game) {
  const date = getGameDate(game);

  if (!date || Number.isNaN(date.getTime())) {
    return game?.date || 'Termin offen';
  }

  return format(date, 'dd.MM.yyyy · HH:mm', { locale: de });
}

function getWinnerIdFromGame(game) {
  if (!game || game.status !== 'final') return null;

  const homeScore = Number(game.scoreHome || 0);
  const awayScore = Number(game.scoreAway || 0);

  if (homeScore === awayScore) return null;

  return homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
}

function getTeamName(team, fallback = 'Teilnehmer offen') {
  return team?.shortName || team?.name || fallback || 'Teilnehmer offen';
}

function getTeamColor(team, fallback = '#2563eb') {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function getRoundNumber(game) {
  const value = Number(game?.round || game?.bracketRound || 0);
  return Number.isFinite(value) ? value : 0;
}

function getMatchupIndex(game) {
  const value = Number(game?.matchupIndex || 0);
  return Number.isFinite(value) ? value : 0;
}

function sortCompetitionGames(a, b) {
  const roundDiff = getRoundNumber(a) - getRoundNumber(b);
  if (roundDiff !== 0) return roundDiff;

  const matchupDiff = getMatchupIndex(a) - getMatchupIndex(b);
  if (matchupDiff !== 0) return matchupDiff;

  const dateA = getGameDate(a)?.getTime() || 0;
  const dateB = getGameDate(b)?.getTime() || 0;
  return dateA - dateB;
}

function getCompetitionGames(games = []) {
  return [...games].filter(game =>
    game.isCompetitionGame ||
    game.competitionId ||
    game.tournamentId ||
    game.round ||
    game.roundName
  ).sort(sortCompetitionGames);
}

function getSeasonGames(games = []) {
  return games.filter(game => !getCompetitionGames([game]).length);
}

function isSeasonFinished(seasonGames = []) {
  if (seasonGames.length === 0) return true;
  return seasonGames.every(game => game.status === 'final');
}

function getFinalGame({ competition, games }) {
  const compGames = getCompetitionGames(games);
  if (compGames.length === 0) return null;

  const bracket = competition?.bracket || competition?.brackets || [];
  const lastRound = bracket.length > 0
    ? Math.max(...bracket.map(round => Number(round.round || 0)).filter(Number.isFinite))
    : Math.max(...compGames.map(getRoundNumber));

  return compGames
    .filter(game => game.status === 'final')
    .filter(game => getRoundNumber(game) === lastRound)
    .sort((a, b) => {
      const dateDiff = (getGameDate(b)?.getTime() || 0) - (getGameDate(a)?.getTime() || 0);
      if (dateDiff !== 0) return dateDiff;
      return getMatchupIndex(a) - getMatchupIndex(b);
    })[0] || null;
}

function shouldShowChampion({ competition, finalGame, champion }) {
  if (!competition || !finalGame || !champion) return false;
  if (!shouldUseBracket(competition)) return false;
  if (finalGame.status !== 'final') return false;

  const type = normalizeType(competition);
  if (type !== 'playoffs' && type !== 'cup') return false;

  return true;
}

function TeamLogo({ team, fallback, size = 'md' }) {
  const sizeClass = size === 'lg'
    ? 'w-16 h-16 rounded-2xl'
    : 'w-10 h-10 rounded-xl';

  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt={team.name || ''}
        className={`${sizeClass} object-contain bg-black/25 border border-white/10 p-1.5 flex-shrink-0`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${sizeClass} bg-secondary border border-border/50 flex items-center justify-center flex-shrink-0`}>
      <Shield className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

function CompetitionHero({ competition, league }) {
  const name = getPublicName(competition);
  const banner = competition?.banner ? getImageUrl(competition.banner) : '';
  const logo = competition?.logo ? getImageUrl(competition.logo) : '';
  const status = competition?.status || 'upcoming';
  const finalName = getFinalRoundName(competition);

  return (
    <section className="px-4 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-35"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.32),transparent_36%),linear-gradient(135deg,#07111f,#0f172a_55%,#111827)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="relative p-5 min-h-[190px] flex flex-col justify-end">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-3xl bg-black/35 border border-white/15 flex items-center justify-center p-2.5 flex-shrink-0 backdrop-blur">
              {logo ? (
                <img src={logo} alt="" className="max-w-full max-h-full object-contain" />
              ) : (
                <Trophy className="w-10 h-10 text-primary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="outline" className={`text-[10px] border ${getStatusStyle(status)}`}>
                  {getStatusLabel(status)}
                </Badge>

                <Badge variant="outline" className="text-[10px] border-white/15 bg-white/10 text-white">
                  {getTypeLabel(competition)}
                </Badge>
              </div>

              <h1 className="text-2xl font-black leading-tight">
                {name}
              </h1>

              <p className="text-xs text-white/65 mt-1">
                {[league?.shortName || league?.name, competition?.season, finalName ? `Finale: ${finalName}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChampionCard({ competition, champion }) {
  if (!champion) return null;

  return (
    <section className="px-4 pt-4 pb-2">
      <Card className="relative overflow-hidden border-yellow-500/25 bg-gradient-to-br from-yellow-500/15 via-card to-card">
        <div className="absolute inset-0 pointer-events-none opacity-70">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300/70 animate-pulse"
              style={{
                left: `${(index * 17) % 100}%`,
                top: `${(index * 29) % 100}%`,
                animationDelay: `${index * 90}ms`,
              }}
            />
          ))}
        </div>

        <div className="relative p-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 mx-auto flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>

          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-400">
            {competition.championTitle || getFinalRoundName(competition) || 'Champion'}
          </p>

          <h2 className="text-2xl font-black mt-1">
            {champion.name}
          </h2>

          {champion.logo && (
            <div className="w-24 h-24 mx-auto mt-4 rounded-3xl bg-black/20 border border-white/10 flex items-center justify-center p-3">
              <img
                src={getImageUrl(champion.logo)}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function QualificationInfo({ text }) {
  const [open, setOpen] = useState(false);

  if (!text?.trim()) return null;

  return (
    <section className="px-4 pt-4 pb-2">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card text-left active:scale-[0.99] transition-transform"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.08),transparent_35%)]" />

        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Qualifikation & Modus
              </p>

              <h2 className="text-sm font-black text-foreground mt-0.5">
                So funktioniert dieser Wettbewerb
              </h2>
            </div>

            <span className="text-xs font-black text-primary flex-shrink-0">
              {open ? 'Weniger' : 'Mehr'}
            </span>
          </div>

          {open && (
            <p className="text-[14px] sm:text-sm text-foreground/90 whitespace-pre-wrap leading-6 mt-4">
              {text}
            </p>
          )}
        </div>
      </button>
    </section>
  );
}

function BracketPlaceholder({ seasonGames }) {
  const total = seasonGames.length;
  const finished = seasonGames.filter(game => game.status === 'final').length;
  const remaining = Math.max(total - finished, 0);

  return (
    <section className="px-4 pt-4 pb-2">
      <Card className="p-5 border-border/50 bg-card">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-black">
              Turnierbaum noch nicht verfügbar
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Der Turnierbaum wird angezeigt, sobald die relevanten Season-Spiele abgeschlossen sind.
            </p>

            {total > 0 && (
              <p className="text-[11px] text-muted-foreground mt-3">
                {finished} von {total} Spielen final
                {remaining > 0 ? ` · ${remaining} offen` : ''}
              </p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}

function TeamLine({ team, fallback, winner = false }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamLogo team={team} fallback={fallback} />
      <p className={`hyphens-auto whitespace-normal break-words text-center text-[12px] font-black leading-[1.12] ${winner ? 'text-green-300' : ''}`}>
        {getTeamName(team, fallback)}
      </p>
    </div>
  );
}

function CompetitionGameCard({ game, teamsById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const winnerId = getWinnerIdFromGame(game);
  const status = getEffectiveGameStatus(game);
  const isFinal = status === 'final';
  const homeWinner = winnerId && winnerId === game.homeTeamId;
  const awayWinner = winnerId && winnerId === game.awayTeamId;

  const homeColor = getTeamColor(home, '#2563eb');
  const awayColor = getTeamColor(away, '#ef4444');

  return (
    <Card
      className="p-3 overflow-hidden border-white/10"
      style={{
        background: `linear-gradient(135deg, ${homeColor}18 0%, #101722 48%, ${awayColor}18 100%)`,
        boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
            {game.roundName || `Runde ${game.round || '-'}`}
          </p>

          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatGameDate(game)}
          </p>
        </div>

        <Badge variant="outline" className="text-[10px] border-white/15 bg-white/10">
          {GAME_STATUS_LABELS[status] || status || 'Geplant'}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
          <div className="flex min-w-0 justify-center">
            <TeamLogo team={home} fallback={homeName} />
          </div>

          <div className="text-center min-w-[92px]">
            {status === 'live' || status === 'final' ? (
              <ScoreDisplay
                homeScore={game.scoreHome ?? 0}
                awayScore={game.scoreAway ?? 0}
                size="sm"
              />
            ) : (
              <p className="text-xs font-black text-muted-foreground">
                VS
              </p>
            )}

            {isFinal && winnerId && (
              <p className="text-[9px] text-green-300 mt-0.5">
                Winner
              </p>
            )}
          </div>

          <div className="flex min-w-0 justify-center">
            <TeamLogo team={away} fallback={awayName} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <p className={`hyphens-auto whitespace-normal break-words text-center text-[12px] font-black leading-[1.12] ${homeWinner ? 'text-green-300' : ''}`}>
            {homeName}
          </p>
          <p className={`hyphens-auto whitespace-normal break-words text-center text-[12px] font-black leading-[1.12] ${awayWinner ? 'text-green-300' : ''}`}>
            {awayName}
          </p>
        </div>
      </div>

      {(game.venue || game.city) && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-3">
          <MapPin className="w-3 h-3" />
          <span className="truncate">
            {[game.venue, game.city].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
    </Card>
  );
}

function GameListMode({ competition, games, teamsById }) {
  const compGames = getCompetitionGames(games);

  if (compGames.length === 0) {
    return (
      <section className="px-4 pt-4 pb-2">
        <Card className="px-4 py-8 text-center border-border/50 bg-card">
          <p className="text-sm font-semibold text-muted-foreground">
            Noch keine Wettbewerbsspiele angelegt.
          </p>
        </Card>
      </section>
    );
  }

  const grouped = compGames.reduce((acc, game) => {
    const key = game.roundName || `Runde ${game.round || 1}`;
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(game);
    return acc;
  }, new Map());

  return (
    <section className="px-4 pt-4 pb-2 space-y-5">
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-orange-300">
          Spielkarten-Modus
        </p>

        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {normalizeType(competition) === 'playdowns'
            ? 'Playdowns werden bewusst nicht als Champion-Turnierbaum angezeigt.'
            : 'Dieser Wettbewerb wird als Entscheidungsrunde mit Spielkarten angezeigt.'}
        </p>
      </div>

      {Array.from(grouped.entries()).map(([roundName, roundGames]) => (
        <div key={roundName}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className="text-sm font-black">
              {roundName}
            </h2>

            <span className="text-[11px] font-bold text-muted-foreground">
              {roundGames.length} Spiel{roundGames.length === 1 ? '' : 'e'}
            </span>
          </div>

          <div className="space-y-2">
            {roundGames.map(game => (
              <CompetitionGameCard
                key={game.id}
                game={game}
                teamsById={teamsById}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function BracketMode({ competition, teams, seasonFinished, seasonGames }) {
  if (!seasonFinished) {
    return <BracketPlaceholder seasonGames={seasonGames} />;
  }

  return (
    <section className="pt-4 pb-2">
      <BracketView tournament={competition} teams={teams} />
    </section>
  );
}

export default function CompetitionDetail() {
  const { competitionId } = useParams();

  useSetHeader({ mode: 'back', title: 'Wettbewerb' });

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [competitionId]);

  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ['publicCompetition', competitionId],
    queryFn: async () => {
      const result = await base44.entities.Tournament.filter({ id: competitionId });
      return result?.[0] || null;
    },
    enabled: !!competitionId,
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['competitionGamesPublic', competitionId],
    queryFn: async () => {
      const byCompetition = await base44.entities.Game.filter({ competitionId });
      const byTournament = await base44.entities.Game.filter({ tournamentId: competitionId });

      const map = new Map();

      [...(byCompetition || []), ...(byTournament || [])].forEach(game => {
        if (game?.id) map.set(game.id, game);
      });

      return [...map.values()];
    },
    enabled: !!competitionId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamsPublic'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leaguesPublic'],
    queryFn: () => base44.entities.League.list(),
  });

  const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);

  const league = useMemo(() => {
    return leagues.find(item => item.id === competition?.leagueId) || null;
  }, [competition?.leagueId, leagues]);

  const qualificationText = useMemo(() => {
    return getQualificationText(competition);
  }, [competition]);

  const seasonGames = useMemo(() => getSeasonGames(games), [games]);
  const seasonFinished = useMemo(() => isSeasonFinished(seasonGames), [seasonGames]);

  const finalGame = useMemo(() => {
    if (!competition) return null;
    return getFinalGame({ competition, games });
  }, [competition, games]);

  const championId = getWinnerIdFromGame(finalGame);
  const champion = championId ? teamsById.get(championId) : null;
  const showChampion = shouldShowChampion({ competition, finalGame, champion });

  if (compLoading || gamesLoading || !competition) {
    return (
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-12 pb-24 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4 pb-24">
      <CompetitionHero competition={competition} league={league} />

      {showChampion && (
        <ChampionCard
          competition={competition}
          champion={champion}
        />
      )}

      <QualificationInfo text={qualificationText} />

      {shouldUseGameList(competition) ? (
        <GameListMode
          competition={competition}
          games={games}
          teamsById={teamsById}
        />
      ) : (
        <BracketMode
          competition={competition}
          teams={teams}
          seasonFinished={seasonFinished}
          seasonGames={seasonGames}
        />
      )}
    </div>
  );
}
