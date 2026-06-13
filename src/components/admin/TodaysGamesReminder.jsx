import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Radio, Shield } from 'lucide-react';
import { isToday, parseISO, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

function TeamLogo({ logo, name }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name || ''}
        className="w-6 h-6 object-contain rounded"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center flex-shrink-0">
      <Shield className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}

function getKickoffTime(game) {
  if (game.kickoffAt) {
    try {
      return parseISO(game.kickoffAt);
    } catch {
      return null;
    }
  }

  if (game.date && game.time) {
    const parsed = new Date(`${game.date}T${game.time}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function getTeamName(team, placeholder) {
  return team?.shortName || team?.name || placeholder || '?';
}

function GameCard({ game, homeTeam, awayTeam }) {
  const navigate = useNavigate();
  const kickoffTime = getKickoffTime(game);

  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3.5 transition-all">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold text-red-400 tracking-widest">
            LIVE
          </span>
        </div>

        {kickoffTime && (
          <span className="text-[10px] text-muted-foreground">
            {format(kickoffTime, 'HH:mm', { locale: de })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <TeamLogo logo={homeTeam?.logo} name={homeTeam?.name} />

        <span className="text-sm font-semibold flex-1 truncate">
          {getTeamName(homeTeam, game.homeTeamPlaceholder)}
        </span>

        <span className="text-sm font-black tabular-nums px-2">
          {game.scoreHome ?? 0} : {game.scoreAway ?? 0}
        </span>

        <span className="text-sm font-semibold flex-1 text-right truncate">
          {getTeamName(awayTeam, game.awayTeamPlaceholder)}
        </span>

        <TeamLogo logo={awayTeam?.logo} name={awayTeam?.name} />
      </div>

      <Button
        size="sm"
        className="w-full h-8 text-xs font-semibold"
        onClick={() => navigate(`/admin/game-result?gameId=${game.id}`)}
      >
        Ergebnis eintragen
      </Button>
    </div>
  );
}

function LeagueGroup({ league, games, teams, isOpen, onToggle }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/40 flex items-center justify-center flex-shrink-0">
          {league?.logo ? (
            <img
              src={league.logo}
              alt=""
              className="w-6 h-6 object-contain rounded"
              onError={event => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Radio className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {league?.shortName || league?.name || 'Ohne Liga'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {games.length} Live-Spiel{games.length === 1 ? '' : 'e'}
          </p>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
          LIVE
        </span>

        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/40 p-2.5 space-y-2">
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              homeTeam={teams[game.homeTeamId]}
              awayTeam={teams[game.awayTeamId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodaysGamesReminder() {
  const [openLeagueId, setOpenLeagueId] = useState('');
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: allGames = [] } = useQuery({
    queryKey: ['today-games-reminder'],
    queryFn: () => base44.entities.Game.list('-date', 500),
    staleTime: 0,
    refetchInterval: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: teams = {} } = useQuery({
    queryKey: ['teams-map'],
    queryFn: async () => {
      const list = await base44.entities.Team.list();
      return Object.fromEntries(list.map(team => [team.id, team]));
    },
    staleTime: 300000,
  });

  const { data: leagues = {} } = useQuery({
    queryKey: ['leagues-map'],
    queryFn: async () => {
      const list = await base44.entities.League.list();
      return Object.fromEntries(list.map(league => [league.id, league]));
    },
    staleTime: 300000,
  });

  useEffect(() => {
    if (!location.state?.resultSavedAt) return;

    queryClient.invalidateQueries({ queryKey: ['today-games-reminder'] });
    queryClient.invalidateQueries({ queryKey: ['admin-count-games'] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
  }, [location.state?.resultSavedAt, queryClient]);

  const liveGamesByLeague = useMemo(() => {
    const liveGames = allGames
      .filter(game => {
        if (game.status !== 'live') return false;

        if (!game.date) return true;

        try {
          return isToday(parseISO(game.date));
        } catch {
          return true;
        }
      })
      .sort((a, b) => {
        const timeA = getKickoffTime(a)?.getTime() || 0;
        const timeB = getKickoffTime(b)?.getTime() || 0;

        return timeA - timeB;
      });

    const grouped = liveGames.reduce((acc, game) => {
      const leagueId = game.leagueId || 'without-league';

      if (!acc[leagueId]) {
        acc[leagueId] = [];
      }

      acc[leagueId].push(game);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([leagueId, games]) => ({
        leagueId,
        league: leagues[leagueId],
        games,
      }))
      .sort((a, b) => {
        const nameA = a.league?.shortName || a.league?.name || 'Ohne Liga';
        const nameB = b.league?.shortName || b.league?.name || 'Ohne Liga';

        return nameA.localeCompare(nameB);
      });
  }, [allGames, leagues]);

  const liveCount = liveGamesByLeague.reduce((sum, group) => sum + group.games.length, 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Live-Ergebnisse</h3>

            {liveCount > 0 && (
              <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-bold">
                {liveCount}
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-0.5 ml-6">
            Liga öffnen und Ergebnis eintragen
          </p>
        </div>

        {liveCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] font-bold text-red-400">
              Live
            </span>
          </div>
        )}
      </div>

      {liveCount === 0 ? (
        <div className="bg-card border border-border/40 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aktuell keine Live-Spiele zum Eintragen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {liveGamesByLeague.map(group => (
            <LeagueGroup
              key={group.leagueId}
              league={group.league}
              games={group.games}
              teams={teams}
              isOpen={openLeagueId === group.leagueId}
              onToggle={() => {
                setOpenLeagueId(current =>
                  current === group.leagueId ? '' : group.leagueId
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
