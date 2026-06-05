import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function ClubQuickInfo({ club }) {
  const { games, leagues, teams } = useGlobalData();

  const league = useMemo(() => {
    return leagues.find(l => l.id === club.leagueId);
  }, [club.leagueId, leagues]);

  const nextGame = useMemo(() => {
    return games
      .filter(g => (g.homeTeamId === club.id || g.awayTeamId === club.id) && g.status === 'scheduled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [club.id, games]);

  const lastGame = useMemo(() => {
    return games
      .filter(g => (g.homeTeamId === club.id || g.awayTeamId === club.id) && g.status === 'final')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [club.id, games]);

  const getOpponentName = (game, isHome) => {
    const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
    const opponent = teams.find(t => t.id === opponentId);
    return opponent?.shortName || opponent?.name || '—';
  };

  const infoItems = [
    {
      label: 'Nächstes Spiel',
      value: nextGame ? (
        <div className="text-sm">
          <div className="font-semibold">{getOpponentName(nextGame, nextGame.homeTeamId === club.id)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(nextGame.date), { addSuffix: true, locale: de })}
          </div>
        </div>
      ) : '—',
    },
    {
      label: 'Letztes Spiel',
      value: lastGame ? (
        <div className="text-sm">
          <div className="font-semibold">
            {lastGame.homeTeamId === club.id ? (
              <>
                {lastGame.scoreHome} - {lastGame.scoreAway}
              </>
            ) : (
              <>
                {lastGame.scoreAway} - {lastGame.scoreHome}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{getOpponentName(lastGame, lastGame.homeTeamId === club.id)}</div>
        </div>
      ) : '—',
    },
    {
      label: 'Liga',
      value: league?.shortName || league?.name || '—',
    },
    {
      label: 'Stadion',
      value: club.stadium || '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-4">
      {infoItems.map((item, i) => (
        <Card key={i} className="p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {item.label}
          </div>
          <div className="text-sm font-semibold">{item.value}</div>
        </Card>
      ))}
    </div>
  );
}