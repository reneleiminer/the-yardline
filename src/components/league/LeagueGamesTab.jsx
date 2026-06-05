import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImageUrl } from '@/lib/imageUtils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function LeagueGamesTab({ league }) {
  const navigate = useNavigate();
  const { games, teams } = useGlobalData();

  const leagueGames = useMemo(() => {
    return games
      .filter(g => {
        const homeTeam = teams.find(t => t.id === g.homeTeamId);
        const awayTeam = teams.find(t => t.id === g.awayTeamId);
        return homeTeam?.leagueId === league.id || awayTeam?.leagueId === league.id;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [league.id, games, teams]);

  const getTeam = (teamId) => {
    return teams.find(team => team.id === teamId);
  };

  if (leagueGames.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Noch keine Spiele.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 pb-20">
      {leagueGames.map(game => {
        const homeTeam = getTeam(game.homeTeamId);
        const awayTeam = getTeam(game.awayTeamId);
        const hasScore = game.status === 'final' || game.status === 'live';

        return (
          <Card
            key={game.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/game/${game.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/game/${game.id}`);
              }
            }}
            className="p-4 cursor-pointer hover:border-primary/40 hover:bg-secondary/20 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                {homeTeam?.logo && (
                  <img
                    src={getImageUrl(homeTeam.logo)}
                    alt=""
                    className="h-7 w-7 object-contain flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = getImageUrl(); }}
                  />
                )}
                <div className="text-sm font-semibold truncate">
                  {homeTeam?.shortName || homeTeam?.name || 'Heimteam'}
                </div>
              </div>

              <div className="text-center flex-shrink-0 px-2">
                {hasScore ? (
                  <>
                    <div className="text-sm font-bold tabular-nums">
                      {game.scoreHome ?? 0} - {game.scoreAway ?? 0}
                    </div>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {game.status === 'final' ? 'Fertig' : 'Live'}
                    </Badge>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground max-w-32">
                    {game.date
                      ? formatDistanceToNow(new Date(game.date), { addSuffix: true, locale: de })
                      : 'Ohne Datum'}
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                <div className="text-sm font-semibold truncate text-right">
                  {awayTeam?.shortName || awayTeam?.name || 'Gastteam'}
                </div>
                {awayTeam?.logo && (
                  <img
                    src={getImageUrl(awayTeam.logo)}
                    alt=""
                    className="h-7 w-7 object-contain flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = getImageUrl(); }}
                  />
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}