import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function LeagueQuickInfo({ league }) {
  const { games, teams } = useGlobalData();

  const leagueTeams = useMemo(() => {
    return teams.filter(t => t.leagueId === league.id);
  }, [league.id, teams]);

  const leagueGames = useMemo(() => {
    return games.filter(g => {
      const homeTeam = teams.find(t => t.id === g.homeTeamId);
      const awayTeam = teams.find(t => t.id === g.awayTeamId);
      return homeTeam?.leagueId === league.id || awayTeam?.leagueId === league.id;
    });
  }, [league.id, games, teams]);

  const nextGame = useMemo(() => {
    return leagueGames
      .filter(g => g.status === 'scheduled')
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [leagueGames]);

  const lastGame = useMemo(() => {
    return leagueGames
      .filter(g => g.status === 'final')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [leagueGames]);

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.shortName || team?.name || '—';
  };

  const infoItems = [
    {
      label: 'Teams',
      value: leagueTeams.length,
    },
    {
      label: 'Nächstes Spiel',
      value: nextGame ? (
        <div className="text-sm">
          <div className="font-semibold">{getTeamName(nextGame.homeTeamId)} - {getTeamName(nextGame.awayTeamId)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(nextGame.date), { addSuffix: true, locale: de })}
          </div>
        </div>
      ) : '—',
    },
    {
      label: 'Letztes Ergebnis',
      value: lastGame ? (
        <div className="text-sm">
          <div className="font-semibold">{lastGame.scoreHome} - {lastGame.scoreAway}</div>
          <div className="text-xs text-muted-foreground">{getTeamName(lastGame.homeTeamId)} - {getTeamName(lastGame.awayTeamId)}</div>
        </div>
      ) : '—',
    },
    {
      label: 'Saison',
      value: league.season || '—',
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