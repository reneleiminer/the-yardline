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
        className="h-16 w-16 object-contain rounded-2xl bg-black/22 border border-white/12 p-1.5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/12 bg-black/24">
      <Shield className="h-7 w-7 text-white/56" />
    </div>
  );
}

export default function ScoreHero({ game, home, away, league }) {
  const [animateWinner, setAnimateWinner] = useState(false);
  const navigate = useNavigate();

  const status = String(game.status || 'scheduled').toLowerCase();
  const isLive = status === 'live';
  const isFinal = status === 'final';
  const hasScore = isLive || isFinal;

  const homeColor = home?.primaryColor || home?.colorPrimary || '#013369';
  const awayColor = away?.primaryColor || away?.colorPrimary || '#c20f1a';

  const leagueName = league?.name ? `${league.name}${game.groupId ? ` - ${game.groupId}` : ''}` : '';
  const weekLabel = game.week ? `Spieltag ${game.week}` : '';
  const roundLabel = game.roundName || '';

  const homeName = home?.name || home?.shortName || 'Heimteam';
  const awayName = away?.name || away?.shortName || 'Gastteam';

  const homeScore = game.scoreHome ?? 0;
  const awayScore = game.scoreAway ?? 0;

  const homeWins = hasScore && Number(homeScore) > Number(awayScore);
  const awayWins = hasScore && Number(awayScore) > Number(homeScore);
  const isDraw = hasScore && Number(homeScore) === Number(awayScore);
  const hasWinner = isFinal && !isDraw && (homeWins || awayWins);

  useEffect(() => {
    if (hasWinner) setAnimateWinner(true);
  }, [hasWinner]);

  const homeDimmed = isFinal && awayWins;
  const awayDimmed = isFinal && homeWins;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black text-white shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
        <div className="absolute inset-0 grid grid-cols-2">
          <div style={{ background: homeColor }} />
          <div style={{ background: awayColor }} />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0_1px,transparent_1px_18px)] opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-black/8 to-black/28" />

        <div className="relative px-4 py-4">
          {(leagueName || weekLabel || roundLabel) && (
            <div className="mb-4 text-center text-[10px] font-black uppercase tracking-wider text-white/78 whitespace-normal break-words">
              {[leagueName, weekLabel, roundLabel].filter(Boolean).join(' - ')}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
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

              <span className="w-full max-w-[118px] whitespace-normal break-words text-center text-sm font-black leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.58)]">
                {homeName}
              </span>
            </button>

            <div className="flex min-w-[108px] flex-shrink-0 flex-col items-center gap-1.5 rounded-[22px] border border-white/22 bg-black/78 px-3 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.54)] backdrop-blur">
              {hasScore ? (
                <div className="flex items-center gap-2 text-white">
                  <ScorePill score={homeScore} size="lg" />
                  <span className="text-xl font-light text-white/42">:</span>
                  <ScorePill score={awayScore} size="lg" />
                </div>
              ) : (
                <span className="text-2xl font-black text-[#ff2338] tabular-nums">
                  {game.time || game.kickoffTime || '--:--'}
                </span>
              )}

              {isLive ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-black tracking-widest text-red-400">LIVE</span>
                </div>
              ) : isFinal ? (
                <span className="text-[10px] font-black tracking-wider text-white/68">FINAL</span>
              ) : (
                <span className="text-[10px] font-black tracking-wider text-white/58">KICKOFF</span>
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

              <span className="w-full max-w-[118px] whitespace-normal break-words text-center text-sm font-black leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.58)]">
                {awayName}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
