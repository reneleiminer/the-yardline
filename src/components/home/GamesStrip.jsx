import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameCard from '@/components/feed/GameCard';
import { Play, Star, Radio } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { useLeagueTheme } from '@/lib/useLeagueTheme';
import { useAppUser } from '@/lib/useAppUser';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function parseGameDate(game) {
  if (!game?.date) return null;

  const [year, month, day] = String(game.date).split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function isWithinTodayAndNext7Days(game) {
  const date = parseGameDate(game);
  if (!date) return false;

  const today = getTodayStart();
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return date >= today && date <= end;
}

function sortByDateTime(a, b) {
  const dateA = `${a.date || ''} ${a.time || a.kickoffTime || ''}`;
  const dateB = `${b.date || ''} ${b.time || b.kickoffTime || ''}`;

  return dateA.localeCompare(dateB);
}

function hexToRgbParts(hex) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;

  return clean
    .match(/.{2}/g)
    .map(part => parseInt(part, 16))
    .join(', ');
}

function gameMatchesFollow(game, followedTeamIds, followedLeagueIds) {
  if (!game) return false;

  return (
    followedLeagueIds.has(game.leagueId) ||
    followedTeamIds.has(game.homeTeamId) ||
    followedTeamIds.has(game.awayTeamId)
  );
}

function TeamLogo({ team }) {
  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt=""
        className="w-8 h-8 rounded-lg object-contain bg-background/70 border border-border/40 flex-shrink-0"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-secondary/70 border border-border/40 flex-shrink-0" />
  );
}

function getTeamName(team, placeholder) {
  return team?.shortName || team?.name || placeholder || 'Offen';
}

function LiveGameCard({ game, home, away, isFavorite }) {
  const navigate = useNavigate();

  const accentColor = home?.primaryColor || away?.primaryColor || null;
  const theme = useLeagueTheme(accentColor);
  const rgb = hexToRgbParts(accentColor);

  const cardStyle = rgb
    ? {
        background: `linear-gradient(135deg, rgba(${rgb}, 0.14), rgba(8,12,22,0.96))`,
        borderColor: `rgba(${rgb}, 0.42)`,
        boxShadow: `0 0 18px rgba(${rgb}, 0.1)`,
      }
    : {
        background: 'linear-gradient(135deg, rgba(59,130,246,0.13), rgba(8,12,22,0.96))',
      };

  const liveColor = theme.color || '#38bdf8';

  return (
    <button
      type="button"
      onClick={() => navigate(`/game/${game.id}`)}
      className="w-[280px] sm:w-[320px] flex-shrink-0 rounded-2xl border border-border/50 p-3 text-left active:scale-[0.99] transition-all"
      style={cardStyle}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: liveColor }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: liveColor }}
          />
        </span>

        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: liveColor }}
        >
          Live
        </span>

        {isFavorite && (
          <span className="flex items-center gap-1 rounded-full bg-yellow-400/12 border border-yellow-400/25 px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" />
            Folge ich
          </span>
        )}

        {game.streamUrl && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Play className="w-3 h-3 fill-primary" />
            Stream
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <TeamLogo team={home} />
          <p className="text-xs font-bold truncate">
            {getTeamName(home, game.homeTeamPlaceholder)}
          </p>
        </div>

        <div className="min-w-[62px] rounded-xl bg-background/50 border border-border/40 px-2 py-1 text-center">
          <span className="text-lg font-black tabular-nums">
            {game.scoreHome ?? 0}
          </span>
          <span className="mx-1 text-muted-foreground">
            -
          </span>
          <span className="text-lg font-black tabular-nums">
            {game.scoreAway ?? 0}
          </span>
        </div>

        <div className="min-w-0 flex items-center gap-2 justify-end text-right">
          <p className="text-xs font-bold truncate">
            {getTeamName(away, game.awayTeamPlaceholder)}
          </p>
          <TeamLogo team={away} />
        </div>
      </div>
    </button>
  );
}

function LiveGamesRow({ games, teamsMap, favoriteGameIds }) {
  if (games.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">
            Live Spiele
          </h3>
          <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-black">
            {games.length}
          </span>
        </div>

        <Link to="/spiele" className="text-primary text-xs font-medium">
          Alle →
        </Link>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto hide-scrollbar pb-1">
        {games.map(game => (
          <LiveGameCard
            key={game.id}
            game={game}
            home={teamsMap[game.homeTeamId]}
            away={teamsMap[game.awayTeamId]}
            isFavorite={favoriteGameIds.has(game.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GamesRow({ title, games, teamsMap, favoriteGameIds, showFavoriteBadge = false }) {
  if (games.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3 px-4">
        <h3 className="font-bold text-sm">{title}</h3>
        <Link to="/spiele" className="text-primary text-xs font-medium">
          Alle →
        </Link>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto hide-scrollbar">
        {games.slice(0, 8).map(game => (
          <div key={game.id} className="flex-shrink-0 w-52 relative">
            {showFavoriteBadge && favoriteGameIds.has(game.id) && (
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-[9px] font-bold text-yellow-400">
                  Folge ich
                </span>
              </div>
            )}

            <GameCard
              game={game}
              home={teamsMap[game.homeTeamId]}
              away={teamsMap[game.awayTeamId]}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GamesStrip({ games = [], teams = [] }) {
  const { appUser } = useAppUser();

  const { data: following = [] } = useQuery({
    queryKey: ['following', appUser?.id],
    queryFn: () => appUser ? base44.entities.Follow.filter({ followerId: appUser.id }) : [],
    enabled: !!appUser,
    staleTime: 60 * 1000,
  });

  const teamsMap = useMemo(() => {
    const map = {};

    teams.forEach(team => {
      map[team.id] = team;
    });

    return map;
  }, [teams]);

  const followedTeamIds = useMemo(() => {
    return new Set(
      following
        .filter(item => item.targetType === 'club' || item.targetType === 'team')
        .map(item => item.targetId)
    );
  }, [following]);

  const followedLeagueIds = useMemo(() => {
    return new Set(
      following
        .filter(item => item.targetType === 'league')
        .map(item => item.targetId)
    );
  }, [following]);

  const visibleGames = useMemo(() => {
    return games
      .filter(isWithinTodayAndNext7Days)
      .sort(sortByDateTime);
  }, [games]);

  const favoriteGames = useMemo(() => {
    return visibleGames.filter(game =>
      gameMatchesFollow(game, followedTeamIds, followedLeagueIds)
    );
  }, [visibleGames, followedTeamIds, followedLeagueIds]);

  const favoriteGameIds = useMemo(() => {
    return new Set(favoriteGames.map(game => game.id));
  }, [favoriteGames]);

  const liveGames = visibleGames.filter(game => game.status === 'live');

  const upcomingGames = visibleGames.filter(game =>
    game.status !== 'live' &&
    game.status !== 'final'
  );

  const resultGames = visibleGames
    .filter(game => game.status === 'final')
    .sort((a, b) => sortByDateTime(b, a));

  const favoriteUpcomingGames = favoriteGames.filter(game =>
    game.status !== 'live' &&
    game.status !== 'final'
  );

  const favoriteResultGames = favoriteGames
    .filter(game => game.status === 'final')
    .sort((a, b) => sortByDateTime(b, a));

  if (visibleGames.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Spiele</h3>
          <Link to="/spiele" className="text-primary text-xs font-medium">
            Alle →
          </Link>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 text-center text-sm text-muted-foreground">
          Keine Spiele in den nächsten 7 Tagen
        </div>
      </div>
    );
  }

  return (
    <div className="py-3">
      <LiveGamesRow
        games={liveGames}
        teamsMap={teamsMap}
        favoriteGameIds={favoriteGameIds}
      />

      {favoriteGames.length > 0 && (
        <>
          <GamesRow
            title="Deine kommenden Spiele"
            games={favoriteUpcomingGames}
            teamsMap={teamsMap}
            favoriteGameIds={favoriteGameIds}
            showFavoriteBadge
          />

          <GamesRow
            title="Deine Ergebnisse"
            games={favoriteResultGames}
            teamsMap={teamsMap}
            favoriteGameIds={favoriteGameIds}
            showFavoriteBadge
          />
        </>
      )}

      <GamesRow
        title="Kommende Spiele"
        games={upcomingGames}
        teamsMap={teamsMap}
        favoriteGameIds={favoriteGameIds}
        showFavoriteBadge
      />

      <GamesRow
        title="Ergebnisse"
        games={resultGames}
        teamsMap={teamsMap}
        favoriteGameIds={favoriteGameIds}
        showFavoriteBadge
      />

      {upcomingGames.length === 0 && resultGames.length === 0 && liveGames.length > 0 && (
        <div className="flex justify-end px-4">
          <Link to="/spiele" className="text-primary text-xs font-medium">
            Alle →
          </Link>
        </div>
      )}
    </div>
  );
}