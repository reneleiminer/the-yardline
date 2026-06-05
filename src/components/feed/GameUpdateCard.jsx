import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';

export default function GameUpdateCard({ game, homeTeam, awayTeam, league }) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isScheduled = game.status === 'scheduled';

  return (
    <div className="border border-border/30 rounded-xl p-4 mx-4 mb-4 bg-card hover:border-border/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {league?.logo && (
            <img src={getImageUrl(league.logo)} alt="" className="w-4 h-4 rounded-full" onError={(e) => { e.target.style.display = 'none'; }} />
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase">{league?.shortName || league?.name || 'Game'}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          isLive ? 'bg-red-500/20 text-red-500' :
          isFinal ? 'bg-green-500/20 text-green-500' :
          'bg-secondary text-muted-foreground'
        }`}>
          {isLive ? '🔴 LIVE' : isFinal ? 'Final' : 'Scheduled'}
        </span>
      </div>

      {/* Teams & Score */}
      <div className="space-y-2">
        {/* Home Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {homeTeam?.logo && (
              <img src={getImageUrl(homeTeam.logo)} alt="" className="w-6 h-6 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            <span className="font-semibold text-sm flex-1 truncate">{homeTeam?.shortName || homeTeam?.name || '???'}</span>
          </div>
          {(isLive || isFinal) && (
            <span className={`text-xl font-bold ${isLive ? 'text-primary' : ''}`}>{game.scoreHome}</span>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center py-1">
          <span className="text-xs text-muted-foreground font-medium">
            {isScheduled && new Date(game.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
            {(isLive || isFinal) && '-'}
          </span>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {awayTeam?.logo && (
              <img src={getImageUrl(awayTeam.logo)} alt="" className="w-6 h-6 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            <span className="font-semibold text-sm flex-1 truncate">{awayTeam?.shortName || awayTeam?.name || '???'}</span>
          </div>
          {(isLive || isFinal) && (
            <span className={`text-xl font-bold`}>{game.scoreAway}</span>
          )}
        </div>
      </div>

      {/* Venue */}
      {game.venue && (
        <p className="text-xs text-muted-foreground mt-3 text-center">{game.venue}</p>
      )}
    </div>
  );
}