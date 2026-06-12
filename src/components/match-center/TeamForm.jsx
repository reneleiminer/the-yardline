import React, { useMemo } from 'react';

const RESULT_CONFIG = {
  W: {
    label: 'Sieg',
    className: 'bg-green-500',
  },
  L: {
    label: 'Niederlage',
    className: 'bg-red-500',
  },
  D: {
    label: 'Unentschieden',
    className: 'bg-muted-foreground',
  },
};

function ResultDot({ result }) {
  const config = RESULT_CONFIG[result] || RESULT_CONFIG.D;

  return (
    <span
      title={config.label}
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.className}`}
    />
  );
}

function LegendDot({ className, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${className}`} />
        <span className="text-[10px] text-white/48 font-medium">
        {label}
      </span>
    </div>
  );
}

function TeamFormRow({ team, results }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-black text-white leading-tight truncate min-w-0">
        {team?.shortName || team?.name || 'Team'}
      </p>

      {results.length > 0 ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {results.map((result, index) => (
            <ResultDot key={`${result}-${index}`} result={result} />
          ))}
        </div>
      ) : (
        <span className="text-[10px] text-white/42 flex-shrink-0">
          Keine Daten
        </span>
      )}
    </div>
  );
}

export default function TeamForm({ game, teams, allGames }) {
  const homeTeam = teams[game.homeTeamId];
  const awayTeam = teams[game.awayTeamId];

  const getFormResults = (teamId, isHomeTeam) => {
    const results = [];

    if (!allGames || !teamId) return results;

    const currentDate = game.date ? new Date(game.date) : new Date();

    const previousGames = allGames
      .filter(g =>
        g.status === 'final' &&
        new Date(g.date) < currentDate &&
        (g.homeTeamId === teamId || g.awayTeamId === teamId)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (game.status === 'final') {
      const teamScore = isHomeTeam ? game.scoreHome : game.scoreAway;
      const opponentScore = isHomeTeam ? game.scoreAway : game.scoreHome;

      if (teamScore > opponentScore) results.push('W');
      else if (teamScore < opponentScore) results.push('L');
      else results.push('D');

      previousGames.slice(0, 4).forEach(g => {
        const isHome = g.homeTeamId === teamId;
        const teamScorePrev = isHome ? g.scoreHome : g.scoreAway;
        const opponentScorePrev = isHome ? g.scoreAway : g.scoreHome;

        if (teamScorePrev > opponentScorePrev) results.push('W');
        else if (teamScorePrev < opponentScorePrev) results.push('L');
        else results.push('D');
      });
    } else {
      previousGames.slice(0, 5).forEach(g => {
        const isHome = g.homeTeamId === teamId;
        const teamScorePrev = isHome ? g.scoreHome : g.scoreAway;
        const opponentScorePrev = isHome ? g.scoreAway : g.scoreHome;

        if (teamScorePrev > opponentScorePrev) results.push('W');
        else if (teamScorePrev < opponentScorePrev) results.push('L');
        else results.push('D');
      });
    }

    return results;
  };

  const homeResults = useMemo(
    () => getFormResults(game.homeTeamId, true),
    [game, allGames]
  );

  const awayResults = useMemo(
    () => getFormResults(game.awayTeamId, false),
    [game, allGames]
  );

  return (
    <div className="px-4 pt-4 pb-2">
      <p className="yardline-heading mb-3 text-[20px]">
        Form
      </p>

      <div className="bg-black/72 border border-white/10 rounded-[24px] px-4 py-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <div className="space-y-4">
          <TeamFormRow team={homeTeam} results={homeResults} />

          <div className="h-px bg-white/10" />

          <TeamFormRow team={awayTeam} results={awayResults} />
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
          <LegendDot className="bg-green-500" label="Sieg" />
          <LegendDot className="bg-red-500" label="Niederlage" />
          <LegendDot className="bg-muted-foreground" label="Unentschieden" />
        </div>
      </div>
    </div>
  );
}
