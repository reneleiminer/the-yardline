import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';
import { getEffectiveGameStatus, hasPlayableScore } from '@/lib/gameStatusUtils';
import { CalendarDays, ChevronRight, Shield } from 'lucide-react';

function formatGameDate(game) {
  if (!game.date) return 'Ohne Datum';

  const date = new Date(game.date);
  if (Number.isNaN(date.getTime())) return game.date;

  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

function TeamLine({ team, fallback }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/70 p-1.5">
        {team?.logo ? (
          <img
            src={getImageUrl(team.logo)}
            alt=""
            className="h-full w-full object-contain"
            onError={event => { event.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <Shield className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span className="min-w-0 text-sm font-black leading-tight line-clamp-2 break-words">
        {team?.shortName || team?.name || fallback}
      </span>
    </div>
  );
}

export default function ClubGamesTab({ club }) {
  const navigate = useNavigate();
  const { games, teamsById } = useGlobalData();

  const clubGames = useMemo(() => {
    return games
      .filter(game => game.homeTeamId === club.id || game.awayTeamId === club.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [games, club.id]);

  if (clubGames.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Noch keine Spiele.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 pb-24">
      {clubGames.map(game => {
        const homeTeam = teamsById?.get(game.homeTeamId);
        const awayTeam = teamsById?.get(game.awayTeamId);
        const status = getEffectiveGameStatus(game);
        const hasScore = (status === 'final' || status === 'live' || status === 'halftime') && hasPlayableScore(game);

        return (
          <button
            key={game.id}
            type="button"
            onClick={() => navigate(`/game/${game.id}`)}
            className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/35 hover:bg-secondary/20 active:scale-[0.99]"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {formatGameDate(game)}
                  {game.time || game.kickoffTime ? ` - ${game.time || game.kickoffTime}` : ''}
                </span>
              </div>

              <Badge variant={status === 'live' ? 'default' : 'outline'} className="flex-shrink-0 text-[10px] font-black">
                {status === 'final' ? 'Final' : status === 'live' ? 'Live' : 'Geplant'}
              </Badge>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0 space-y-2">
                <TeamLine team={homeTeam} fallback={game.homeTeamPlaceholder || 'Heimteam'} />
                <TeamLine team={awayTeam} fallback={game.awayTeamPlaceholder || 'Gastteam'} />
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                {hasScore ? (
                  <div className="text-right text-lg font-black tabular-nums">
                    <div>{game.scoreHome ?? 0}</div>
                    <div>{game.scoreAway ?? 0}</div>
                  </div>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
