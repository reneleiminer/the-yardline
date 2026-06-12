import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Shield } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

function getTeamLabel(team) {
  return team?.shortName || team?.name || 'Team';
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function TeamLogo({ team }) {
  if (team?.logo) {
    return (
      <div className="w-11 h-11 rounded-xl bg-secondary/50 border border-border/40 flex items-center justify-center p-1.5">
        <img
          src={getImageUrl(team.logo)}
          alt={team.name || ''}
          className="max-w-full max-h-full w-auto h-auto object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-11 h-11 rounded-xl bg-secondary border border-border/40 flex items-center justify-center">
      <Shield className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function DonutChart({ homeWins, awayWins, draws, homeColor, awayColor }) {
  const total = homeWins + awayWins + draws;
  const homePercent = total > 0 ? clampPercent((homeWins / total) * 100) : 0;
  const drawPercent = total > 0 ? clampPercent((draws / total) * 100) : 0;
  const awayPercent = total > 0 ? clampPercent((awayWins / total) * 100) : 0;

  const gradient =
    total === 0
      ? 'conic-gradient(hsl(var(--secondary)) 0deg 360deg)'
      : `conic-gradient(
          ${homeColor} 0deg ${homePercent * 3.6}deg,
          #6b7280 ${homePercent * 3.6}deg ${(homePercent + drawPercent) * 3.6}deg,
          ${awayColor} ${(homePercent + drawPercent) * 3.6}deg ${(homePercent + drawPercent + awayPercent) * 3.6}deg
        )`;

  return (
    <div
      className="relative w-28 h-28 rounded-full flex items-center justify-center mx-auto"
      style={{ background: gradient }}
    >
      <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex flex-col items-center justify-center text-white">
        <p className="text-2xl font-black tabular-nums">
          {total}
        </p>
        <p className="text-[9px] text-white/48 font-bold uppercase tracking-wider">
          Spiele
        </p>
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-[10px] text-white/48 font-medium truncate">
          {label}
        </span>
      </div>

      <span className="text-xs font-black tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

export default function HeadToHead({ game, teams, allGames }) {
  const homeTeam = teams[game.homeTeamId];
  const awayTeam = teams[game.awayTeamId];

  const headToHeadGames = useMemo(() => {
    if (!allGames) return [];

    return allGames
      .filter(g =>
        g.status === 'final' &&
        ((g.homeTeamId === game.homeTeamId && g.awayTeamId === game.awayTeamId) ||
         (g.homeTeamId === game.awayTeamId && g.awayTeamId === game.homeTeamId))
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [game, allGames]);

  if (headToHeadGames.length === 0) return null;

  const stats = headToHeadGames.reduce((acc, g) => {
    if (g.homeTeamId === game.homeTeamId) {
      if (g.scoreHome > g.scoreAway) acc.homeWins += 1;
      else if (g.scoreHome < g.scoreAway) acc.awayWins += 1;
      else acc.draws += 1;
    } else {
      if (g.scoreAway > g.scoreHome) acc.homeWins += 1;
      else if (g.scoreAway < g.scoreHome) acc.awayWins += 1;
      else acc.draws += 1;
    }

    return acc;
  }, { homeWins: 0, awayWins: 0, draws: 0 });

  const homeColor = getTeamColor(homeTeam, '#3b82f6');
  const awayColor = getTeamColor(awayTeam, '#f59e0b');

  return (
    <div className="px-4 pt-4 pb-2">
      <p className="yardline-heading mb-3 text-[20px]">
        Direkter Vergleich
      </p>

      <div className="bg-black/72 border border-white/10 rounded-[24px] px-4 py-4 mb-3 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0 flex flex-col items-center">
            <TeamLogo team={homeTeam} />

            <div className="mt-3 w-full">
              <LegendDot color={homeColor} label="Siege" value={stats.homeWins} />
            </div>
          </div>

          <DonutChart
            homeWins={stats.homeWins}
            awayWins={stats.awayWins}
            draws={stats.draws}
            homeColor={homeColor}
            awayColor={awayColor}
          />

          <div className="min-w-0 flex flex-col items-center">
            <TeamLogo team={awayTeam} />

            <div className="mt-3 w-full">
              <LegendDot color={awayColor} label="Siege" value={stats.awayWins} />
            </div>
          </div>
        </div>

        {stats.draws > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <LegendDot color="#6b7280" label="Unentschieden" value={stats.draws} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {headToHeadGames.map(g => {
          const isHomeView = g.homeTeamId === game.homeTeamId;
          const viewedHomeScore = isHomeView ? g.scoreHome : g.scoreAway;
          const viewedAwayScore = isHomeView ? g.scoreAway : g.scoreHome;

          return (
            <Link
              key={g.id}
              to={`/game/${g.id}`}
              className="flex items-center justify-between gap-3 text-xs rounded-xl border border-white/10 bg-black/58 px-3 py-2 text-white hover:bg-white/8 transition-colors"
            >
              <span className="text-white/48 flex-shrink-0">
                {format(new Date(g.date), 'dd.MM.yy', { locale: de })}
              </span>

              <span className="font-black tabular-nums">
                {viewedHomeScore} : {viewedAwayScore}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
