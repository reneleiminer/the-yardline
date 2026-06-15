import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '@/lib/imageUtils';

function TeamLogo({ logo, name, className = 'h-20 w-20' }) {
  if (logo) {
    return (
      <img
        src={getImageUrl(logo)}
        alt={name || ''}
        className={`${className} object-contain rounded-2xl bg-black/22 border border-white/12 p-1.5 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]`}
        onError={event => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl border border-white/12 bg-black/24 ${className}`}>
      <Shield className="h-7 w-7 text-white/56" />
    </div>
  );
}

function toRgba(color, alpha) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  const value = String(color).trim();

  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length === 6) {
      const parsed = Number.parseInt(hex, 16);
      if (Number.isFinite(parsed)) {
        const r = (parsed >> 16) & 255;
        const g = (parsed >> 8) & 255;
        const b = parsed & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
  }

  if (value.startsWith('rgb(')) {
    return value.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  return value;
}

function getKickoffDate(game) {
  if (game?.date) {
    const rawTime = game.time || game.kickoffTime || '00:00';
    const [year, month, day] = String(game.date).split('-').map(Number);
    const [hour, minute] = String(rawTime).split(':').map(Number);

    if (year && month && day) {
      return new Date(
        year,
        month - 1,
        day,
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0
      );
    }
  }

  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}

function getEffectiveStatus(game, kickoff) {
  const rawStatus = String(game?.status || 'scheduled').toLowerCase();

  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'final') return 'final';
  if (rawStatus === 'live') return 'live';

  if (kickoff && kickoff.getTime() <= Date.now()) {
    return 'live';
  }

  return 'scheduled';
}

function hasPlayableScore(game) {
  return (
    game?.scoreHome !== undefined &&
    game?.scoreAway !== undefined &&
    game?.scoreHome !== null &&
    game?.scoreAway !== null &&
    game?.scoreHome !== '' &&
    game?.scoreAway !== '' &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

export default function ScoreHero({ game, home, away, league }) {
  const [animateWinner, setAnimateWinner] = useState(false);
  const navigate = useNavigate();

  const kickoff = getKickoffDate(game);
  const status = getEffectiveStatus(game, kickoff);
  const isLive = status === 'live';
  const isFinal = status === 'final' && hasPlayableScore(game);
  const hasScore = (isLive || isFinal) && hasPlayableScore(game);

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
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[190px] -translate-x-1/2 sm:w-[260px]"
          style={{
            background: `linear-gradient(90deg, ${toRgba(homeColor, 0)} 0%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.52) 40%, rgba(0,0,0,0.76) 50%, rgba(0,0,0,0.52) 60%, rgba(0,0,0,0.22) 82%, ${toRgba(awayColor, 0)} 100%)`,
          }}
        />

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          {(leagueName || weekLabel || roundLabel) && (
            <div className="mb-5 text-center text-[10px] font-black uppercase tracking-wider text-white/78 whitespace-normal break-words">
              {[leagueName, weekLabel, roundLabel].filter(Boolean).join(' - ')}
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
            <button
              type="button"
              className={`min-w-0 flex flex-col items-start gap-4 text-left transition-opacity ${homeDimmed ? 'opacity-55' : 'opacity-100'}`}
              onClick={() => game.homeTeamId && navigate(`/team/${game.homeTeamId}`)}
            >
              <div
                className={`transition-all ${homeWins && animateWinner ? 'winner-animation' : ''} ${homeWins && isFinal ? 'winner-glow' : ''}`}
                style={homeWins ? { '--winner-color': homeColor } : {}}
              >
                <TeamLogo logo={home?.logo} name={home?.name} className="h-[70px] w-[70px] sm:h-[92px] sm:w-[92px]" />
              </div>

              <span className="w-full max-w-[210px] whitespace-normal break-words text-left text-[22px] font-black italic leading-[0.98] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.42)] sm:max-w-[320px] sm:text-[34px]">
                {homeName}
              </span>
            </button>

            <div className="relative z-20 flex min-w-[126px] flex-shrink-0 flex-col items-center justify-center gap-1.5 text-center sm:min-w-[180px]">
              {hasScore ? (
                <div className="grid grid-cols-[52px_auto_52px] items-center justify-center gap-2 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.42)] sm:grid-cols-[68px_auto_68px] sm:gap-4">
                  <span className="text-right text-[34px] font-black leading-none tabular-nums sm:text-[52px]">{homeScore}</span>
                  <span className="inline-flex items-center justify-center rounded-sm bg-black/72 px-1.5 text-[28px] font-black leading-none text-white sm:px-2 sm:text-[40px]">:</span>
                  <span className="text-left text-[34px] font-black leading-none tabular-nums sm:text-[52px]">{awayScore}</span>
                </div>
              ) : (
                <span className="text-[36px] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.36)] sm:text-[52px]">
                  {game.time || game.kickoffTime || '--:--'}
                </span>
              )}

              {isLive ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff2338] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff2338]" />
                  </span>
                  <span className="text-[10px] font-black tracking-[0.22em] text-[#ff2338]">LIVE</span>
                </div>
              ) : isFinal ? (
                <span className="mt-2 text-[10px] font-black tracking-[0.22em] text-white/72">FINAL</span>
              ) : (
                <span className="mt-2 text-[10px] font-black tracking-[0.22em] text-white/72">KICKOFF</span>
              )}
            </div>

            <button
              type="button"
              className={`min-w-0 flex flex-col items-end gap-4 text-right transition-opacity ${awayDimmed ? 'opacity-55' : 'opacity-100'}`}
              onClick={() => game.awayTeamId && navigate(`/team/${game.awayTeamId}`)}
            >
              <div
                className={`transition-all ${awayWins && animateWinner ? 'winner-animation' : ''} ${awayWins && isFinal ? 'winner-glow' : ''}`}
                style={awayWins ? { '--winner-color': awayColor } : {}}
              >
                <TeamLogo logo={away?.logo} name={away?.name} className="h-[70px] w-[70px] sm:h-[92px] sm:w-[92px]" />
              </div>

              <span className="w-full max-w-[210px] whitespace-normal break-words text-right text-[22px] font-black italic leading-[0.98] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.42)] sm:max-w-[320px] sm:text-[34px]">
                {awayName}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
