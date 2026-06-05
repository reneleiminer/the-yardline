import React, { useMemo } from 'react';
import { useGlobalData } from '@/lib/GlobalDataContext';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/lib/imageUtils';
import { Link } from 'react-router-dom';

export default function LeagueTeamsTab({ league }) {
  const { teams } = useGlobalData();

  const leagueTeams = useMemo(() => {
    return teams.filter(t => t.leagueId === league.id);
  }, [league.id, teams]);

  if (leagueTeams.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground text-sm">Keine Teams vorhanden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 pb-20">
      {leagueTeams.map(team => (
        <Link key={team.id} to={`/team/${team.id}`}>
          <Card className="p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
            {team.logo && (
              <img
                src={getImageUrl(team.logo)}
                alt=""
                className="h-10 w-10 object-contain flex-shrink-0"
                onError={(e) => { e.target.src = getImageUrl(); }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{team.name}</div>
              {team.city && (
                <div className="text-xs text-muted-foreground">{team.city}</div>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}