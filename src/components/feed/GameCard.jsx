import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Shield, Trophy } from 'lucide-react';

import ScorePill from '@/components/game/ScorePill';
import { getImageUrl } from '@/lib/imageUtils';

function TeamLogo({ logo, name }) {
  if (logo) {
    return (
      <div className="w-8 h-8 rounded-lg bg-secondary/40 border border-border/30 flex items-center justify-center flex-shrink-0 p-1">
        <img
          src={getImageUrl(logo)}
          alt={name || ''}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="max-w-full max-h-full w-auto h-auto object-contain"
          onError={event => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center border border-border/30">
      <Shield className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

function hasStream(game) {
  if (game.status === 'final') return false;
  if (game.streamEnabled === false) return false;
  if (game.streamUrl && game.streamStatus !== 'rejected') return true;

  return Array.isArray(game.streamLinks)
    ? game.streamLinks.some(link => link?.url && link?.enabled !== false && link?.status !== 'rejected')
    : false;
}

function getPrimaryStreamUrl(game) {
  if (game.status === 'final') return '';

  if (game.streamUrl && game.streamStatus !== 'rejected') {
    return game.streamUrl;
  }

  const stream = Array.isArray(game.streamLinks)
    ? game.streamLinks.find(link => link?.url && link?.enabled !== false && link?.status !== 'rejected')
    : null;

  return stream?.url || '';
}

function formatGameDate(game) {
  const value = game?.kickoffAt || game?.date;
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || 'Offen';
}

function getTeamColor(team, fallback = 'hsl(var(--muted))') {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

export default function GameCard({
  game,
  home,
  away,
  compact = false,
  clickable = true,
  isInLiveSection = false,
}) {
  const navigate = useNavigate();

  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const hasScore = isLive || isFinal;
  const showLiveLabel = isLive && !isInLiveSection;

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = isLive ? '#ef4444' : getTeamColor(home);
  const awayColor = isLive ? '#ef4444' : getTeamColor(away);
  const streamUrl = getPrimaryStreamUrl(game);

  const dateLabel = formatGameDate(game);
  const timeLabel = game.time || game.kickoffTime || '';

  const handleCardClick = () => {
    if (!clickable || !game?.id) return;
    navigate(`/game/${game.id}`);
  };

  const handleStreamClick = event => {
    event.stopPropagation();

    if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={event => {
        if (!clickable) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
      className={`relative bg-card border border-border/50 rounded-2xl overflow-hidden transition-all active:scale-[0.99] hover:border-primary/30 ${
        clickable ? 'cursor-pointer' : ''
      }`}
      style={{
        boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
      }}
    >
      <div className={`flex items-center justify-between gap-2 px-3 pt-2.5 pb-1 ${compact ? 'pt-2 pb-0.5' : ''}`}>
        {showLiveLabel ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>

            <span className="text-[10px] font-black tracking-widest uppercase text-red-400">
              Live
            </span>
          </div>
        ) : isInLiveSection && isLive ? (
          <span className="text-[10px] font-black uppercase text-red-400">Live</span>
        ) : isFinal ? (
          <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">
            Final
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground truncate">
            {[dateLabel, timeLabel].filter(Boolean).join(' · ') || 'Termin offen'}
          </span>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(game.isCompetitionGame || game.competitionId || game.tournamentId) && (
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
          )}

          {hasStream(game) && streamUrl && (
            <button
              type="button"
              onClick={handleStreamClick}
              className="hover:opacity-100 transition-opacity active:scale-95"
              aria-label="Stream öffnen"
            >
              <Radio className="w-3.5 h-3.5 text-primary" />
            </button>
          )}
        </div>
      </div>

      <div className={`px-3 ${compact ? 'pb-2' : 'pb-3'} space-y-1.5`}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <TeamLogo logo={home?.logo} name={homeName} />

          <div className="text-sm font-black truncate text-foreground text-left">
            {homeName}
          </div>

          {hasScore && (
            <ScorePill score={game.scoreHome} size="sm" />
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <TeamLogo logo={away?.logo} name={awayName} />

          <div className="text-sm font-black truncate text-foreground text-left">
            {awayName}
          </div>

          {hasScore ? (
            <ScorePill score={game.scoreAway} size="sm" />
          ) : (
            <span className="text-sm font-black text-primary tabular-nums">
              {timeLabel || 'VS'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}