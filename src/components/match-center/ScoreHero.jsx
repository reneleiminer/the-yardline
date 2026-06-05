import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScorePill from '@/components/game/ScorePill';
import { getImageUrl } from '@/lib/imageUtils';

function TeamLogo({ logo, name }) {
  if (logo) {
    return (
      <img
        src={getImageUrl(logo)}
        alt={name || ''}
        className="w-12 h-12 object-contain rounded-xl bg-black/20 border border-white/10 p-1"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-white/10">
      <Shield className="w-6 h-6 text-muted-foreground" />
    </div>
  );
}

export default function ScoreHero({ game, home, away, league }) {
  const [animateWinner, setAnimateWinner] = useState(false);
  const navigate = useNavigate();

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const hasScore = isLive || isFinal;

  const homeColor = home?.primaryColor || home?.colorPrimary || '#2563eb';
  const awayColor = away?.primaryColor || away?.colorPrimary || '#ef4444';

  const leagueName = league?.name ? `${league.name}${game.groupId ? ` · ${game.groupId}` : ''}` : '';
  const weekLabel = game.week ? `Spieltag ${game.week}` : '';
  const roundLabel = game.roundName || '';

  const homeName = home?.shortName || home?.name || 'Heimteam';
  const awayName = away?.shortName || away?.name || 'Gastteam';

  const homeScore = game.scoreHome ?? 0;
  const awayScore = game.scoreAway ?? 0;

  const homeWins = hasScore && homeScore > awayScore;
  const awayWins = hasScore && awayScore > homeScore;
  const isDraw = hasScore && homeScore === awayScore;
  const hasWinner = isFinal && !isDraw && (homeWins || awayWins);

  useEffect(() => {
    if (hasWinner) {
      setAnimateWinner(true);
    }
  }, [hasWinner]);

  const homeDimmed = isFinal && awayWins;
  const awayDimmed = isFinal && homeWins;

  return (
    <div className="px-4 pt-4 pb-2">
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#101722] px-4 py-4"
        style={{
          boxShadow: `inset 6px 0 0 ${homeColor}, inset -6px 0 0 ${awayColor}, 0 16px 36px rgba(0,0,0,0.28)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.055] via-transparent to-black/25 pointer-events-none" />

        <div className="relative">
          {(leagueName || weekLabel || roundLabel) && (
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-4 truncate">
              {[leagueName, weekLabel, roundLabel].filter(Boolean).join(' · ')}
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button
              type="button"
              className={`min-w-0 flex flex-col items-center gap-2 transition-opacity ${homeDimmed ? 'opacity-55' : 'opacity-100'}`}
              onClick={() => game.homeTeamId && navigate(`/team/${game.homeTeamId}`)}
            >
              <div
                className={`transition-all ${homeWins && animateWinner ? 'winner-animation' : ''} ${homeWins && isFinal ? 'winner-glow' : ''}`}
                style={homeWins ? { '--winner-color': homeColor } : {}}
              >
                <TeamLogo logo={home?.logo} name={home?.name} />
              </div>

              <span className="text-sm font-black text-center truncate w-full hover:text-primary transition-colors">
                {homeName}
              </span>
            </button>

            <div className="flex flex-col items-center flex-shrink-0 gap-1.5 min-w-[96px]">
              {hasScore ? (
                <div className="flex items-center gap-2">
                  <ScorePill score={homeScore} size="lg" />
                  <span className="text-xl font-light text-muted-foreground">:</span>
                  <ScorePill score={awayScore} size="lg" />
                </div>
              ) : (
                <span className="text-2xl font-black text-primary tabular-nums">
                  {game.time || game.kickoffTime || '--:--'}
                </span>
              )}

              {isLive ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <span className="text-[10px] font-bold text-red-400 tracking-widest">LIVE</span>
                </div>
              ) : isFinal ? (
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">FINAL</span>
              ) : (
                <span className="text-[10px] text-muted-foreground tracking-wider">GEPLANT</span>
              )}
            </div>

            <button
              type="button"
              className={`min-w-0 flex flex-col items-center gap-2 transition-opacity ${awayDimmed ? 'opacity-55' : 'opacity-100'}`}
              onClick={() => game.awayTeamId && navigate(`/team/${game.awayTeamId}`)}
            >
              <div
                className={`transition-all ${awayWins && animateWinner ? 'winner-animation' : ''} ${awayWins && isFinal ? 'winner-glow' : ''}`}
                style={awayWins ? { '--winner-color': awayColor } : {}}
              >
                <TeamLogo logo={away?.logo} name={away?.name} />
              </div>

              <span className="text-sm font-black text-center truncate w-full hover:text-primary transition-colors">
                {awayName}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}