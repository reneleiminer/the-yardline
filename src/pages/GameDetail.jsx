import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ScoreHero from '@/components/match-center/ScoreHero';
import TeamForm from '@/components/match-center/TeamForm';
import MatchInfo from '@/components/match-center/MatchInfo';
import HeadToHead from '@/components/match-center/HeadToHead';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Image as ImageIcon,
  Instagram,
  Loader2,
  Play,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import useSetHeader from '@/hooks/useSetHeader';
import { getImageUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';

const GAMEDAY_PHOTO_VERSION = 'gameday_photo';
const GAME_PREDICTION_VERSION = 'game_prediction';

function PlaceholderTeam({ label }) {
  return {
    id: null,
    name: label || 'Teilnehmer offen',
    shortName: label || 'Offen',
    logo: null,
    primaryColor: null,
    isPlaceholder: true,
  };
}

function parseMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeExternalUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeInstagramUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const handle = trimmed
    .replace(/^@/, '')
    .replace(/^instagram\.com\//i, '')
    .replace(/^www\.instagram\.com\//i, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');

  if (!handle) return '';

  return `https://instagram.com/${handle}`;
}

function getInstagramLabel(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || /^www\.instagram\.com\//i.test(trimmed) || /^instagram\.com\//i.test(trimmed)) {
    const cleaned = trimmed
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^www\.instagram\.com\//i, '')
      .replace(/^instagram\.com\//i, '')
      .replace(/\?.*$/, '')
      .replace(/\/$/, '');

    return cleaned ? `@${cleaned}` : 'Instagram';
  }

  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

function InstagramCreditButton({ instagram }) {
  const url = normalizeInstagramUrl(instagram);
  const label = getInstagramLabel(instagram);

  if (!url || !label) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-pink-400/25 bg-pink-500/15 px-2 py-1 text-[10px] font-bold text-pink-100 hover:bg-pink-500/25 transition-colors"
      aria-label={`Instagram ${label} oeffnen`}
    >
      <Instagram className="w-3 h-3" />
      <span className="truncate max-w-[96px]">{label}</span>
    </a>
  );
}

function getOrCreateVisitorId() {
  const key = 'yardline_visitor_id';

  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;

    const created = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, created);

    return created;
  } catch {
    return `visitor_${Date.now()}`;
  }
}

function getGameDate(game) {
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
        Number.isFinite(minute) ? minute : 0,
        0,
        0
      );
    }
  }

  if (game?.kickoffAt) {
    const date = new Date(game.kickoffAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function isPredictionOpen(game) {
  if (!game) return false;

  if (game.predictionEnabled === false) return false;

  const status = String(game.status || '').toLowerCase();

  if (status === 'cancelled' || status === 'live' || status === 'final') return false;

  const kickoff = getGameDate(game);
  if (!kickoff) return true;

  return new Date().getTime() < kickoff.getTime();
}

function hasFinalScore(game) {
  return (
    game?.scoreHome !== null &&
    game?.scoreHome !== undefined &&
    game?.scoreAway !== null &&
    game?.scoreAway !== undefined &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

function isFinalGame(game) {
  return game?.status === 'final' || hasFinalScore(game);
}

function buildPredictionStats(predictions, homeTeamId, awayTeamId) {
  const total = predictions.length;

  if (total === 0) {
    return {
      total: 0,
      homeCount: 0,
      awayCount: 0,
      homePercent: 0,
      awayPercent: 0,
    };
  }

  let homeCount = 0;
  let awayCount = 0;

  predictions.forEach(item => {
    const meta = parseMessage(item.message);
    const selectedTeamId = meta.selected_team_id || '';

    if (selectedTeamId === homeTeamId || selectedTeamId === 'home') {
      homeCount += 1;
      return;
    }

    if (selectedTeamId === awayTeamId || selectedTeamId === 'away') {
      awayCount += 1;
    }
  });

  return {
    total,
    homeCount,
    awayCount,
    homePercent: Math.round((homeCount / total) * 100),
    awayPercent: Math.round((awayCount / total) * 100),
  };
}


function getStatValue(stats, key, fallback = 0) {
  const value = stats?.[key];

  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return value;
}

function hasMeaningfulValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function hasMeaningfulObjectValues(object) {
  if (!object || typeof object !== 'object') return false;

  return Object.values(object).some(value => {
    if (value && typeof value === 'object') {
      return hasMeaningfulObjectValues(value);
    }

    return hasMeaningfulValue(value);
  });
}

function hasGameStats(stat) {
  if (!stat) return false;

  return (
    hasMeaningfulObjectValues(stat.homeStats) ||
    hasMeaningfulObjectValues(stat.awayStats) ||
    hasMeaningfulObjectValues(stat.leaders)
  );
}

function formatThirdDown(stats) {
  const made = getStatValue(stats, 'thirdDownMade', '');
  const attempts = getStatValue(stats, 'thirdDownAttempts', '');

  if (made === '' && attempts === '') return '-';
  return `${made || 0}/${attempts || 0}`;
}

function formatStatDisplay(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}
function getLeaderName(leader) {
  return leader?.name || leader?.player || '-';
}

function getLeaderLine(leader) {
  if (!leader || typeof leader !== 'object') return '';

  const parts = [];

  if (leader.completions || leader.attempts) {
    parts.push(`${leader.completions || 0}/${leader.attempts || 0}`);
  }

  if (leader.yards) parts.push(`${leader.yards} YDS`);
  if (leader.touchdowns) parts.push(`${leader.touchdowns} TD`);
  if (leader.interceptions) parts.push(`${leader.interceptions} INT`);
  if (leader.receptions) parts.push(`${leader.receptions} REC`);
  if (leader.tackles) parts.push(`${leader.tackles} TKL`);
  if (leader.sacks) parts.push(`${leader.sacks} SACK`);

  return leader.line || parts.join(' · ');
}

function normalizeStreamLinks(game) {
  if (game?.status === 'final' || game?.status === 'cancelled') return [];

  if (Array.isArray(game?.streamLinks) && game.streamLinks.length > 0) {
    return game.streamLinks
      .map((link, index) => {
        const rawLabel = String(link.label || '').trim();
        const rawProviderName = String(link.providerName || '').trim();
        const rawPlatform = String(link.platform || '').trim();

        const providerName =
          rawProviderName ||
          rawPlatform ||
          (
            rawLabel &&
            rawLabel !== 'Stream' &&
            rawLabel !== 'Hauptstream'
              ? rawLabel
              : ''
          );

        return {
          id: link.id || `${link.url || 'stream'}-${index}`,
          label: rawLabel,
          url: String(link.url || '').trim(),
          providerId: link.providerId || '',
          providerName,
          providerLogo: link.providerLogo || '',
          platform: rawPlatform || providerName,
          status: link.status || 'pending',
          enabled: link.enabled !== false,
        };
      })
      .filter(link => link.url);
  }

  if (game?.streamUrl) {
    const rawLabel = String(game.streamLabel || '').trim();
    const rawProviderName = String(game.streamProviderName || '').trim();
    const rawPlatform = String(game.streamPlatform || '').trim();

    const providerName =
      rawProviderName ||
      rawPlatform ||
      (
        rawLabel &&
        rawLabel !== 'Stream' &&
        rawLabel !== 'Hauptstream'
          ? rawLabel
          : ''
      );

    return [
      {
        id: 'legacy-stream',
        label: rawLabel,
        url: String(game.streamUrl || '').trim(),
        providerId: game.streamProviderId || '',
        providerName,
        providerLogo: game.streamProviderLogo || '',
        platform: rawPlatform || providerName,
        status: game.streamStatus || 'pending',
        enabled: game.streamEnabled !== false,
      },
    ].filter(link => link.url);
  }

  return [];
}

function getVisibleStreamLinks(game) {
  const visibleLinks = normalizeStreamLinks(game).filter(link =>
    link.url &&
    link.enabled !== false &&
    link.status === 'approved'
  );

  const hasRealProvider = visibleLinks.some(link =>
    link.providerId ||
    (
      link.providerName &&
      link.providerName !== 'Stream' &&
      link.providerName !== 'Hauptstream'
    )
  );

  if (!hasRealProvider) return visibleLinks;

  return visibleLinks.filter(link =>
    link.providerId ||
    (
      link.providerName &&
      link.providerName !== 'Stream' &&
      link.providerName !== 'Hauptstream'
    )
  );
}

function getStreamName(stream) {
  return stream.providerName || stream.platform || stream.label || 'Stream oeffnen';
}

function StreamProviderLogo({ stream, size = 'w-10 h-10' }) {
  if (stream.providerLogo) {
    return (
      <img
        src={getImageUrl(stream.providerLogo)}
        alt=""
        className={`${size} rounded-lg object-contain bg-background border border-border/40 flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${size} rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0`}>
      <Play className="w-4 h-4 text-primary fill-primary" />
    </div>
  );
}


function CancelledGameNotice({ game }) {
  if (game?.status !== 'cancelled') return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-300" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-orange-300">
              Dieses Spiel wurde abgesagt
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Das Spiel wird nicht live geschaltet, nicht gewertet und zaehlt nicht fuer Tabellen oder Statistiken.
            </p>

            {game.notes && (
              <p className="text-xs text-orange-100/80 leading-relaxed mt-3 whitespace-pre-wrap">
                {game.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderScoreHero({ game, home, away, league }) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isCancelled = game.status === 'cancelled';
  const hasScore = isLive || isFinal;

  const leagueName = league?.name
    ? `${league.name}${game.groupId ? ` · ${game.groupId}` : ''}`
    : '';

  const weekLabel = game.week ? `Spieltag ${game.week}` : '';
  const homeName = home?.name || home?.shortName || game.homeTeamPlaceholder || 'Teilnehmer offen';
const awayName = away?.name || away?.shortName || game.awayTeamPlaceholder || 'Teilnehmer offen';

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="bg-card rounded-2xl px-4 py-4 border border-border/60">
        {(leagueName || weekLabel || game.roundName) && (
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">
            {[leagueName, weekLabel, game.roundName].filter(Boolean).join(' · ')}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs font-bold text-center leading-tight whitespace-normal break-words w-full">
  {homeName}
</span>
          </div>

          <div className="flex flex-col items-center flex-shrink-0 gap-1">
            {isCancelled ? (
              <span className="text-lg font-black text-orange-300 uppercase tracking-wider">
                Abgesagt
              </span>
            ) : hasScore ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black tabular-nums">{game.scoreHome ?? 0}</span>
                <span className="text-xl font-light text-muted-foreground">-</span>
                <span className="text-xl font-black tabular-nums">{game.scoreAway ?? 0}</span>
              </div>
            ) : (
              <span className="text-2xl font-black text-primary tabular-nums">
                {game.time || '--:--'}
              </span>
            )}

            {isLive ? (
              <span className="text-[10px] font-bold text-red-400 tracking-widest">
                LIVE
              </span>
            ) : isFinal ? (
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                FINAL
              </span>
            ) : isCancelled ? (
              <span className="text-[10px] font-bold text-orange-300 tracking-widest">
                ABGESAGT
              </span>
            ) : null}
          </div>

          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Shield className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-xs font-bold text-center leading-tight whitespace-normal break-words w-full">
  {awayName}
</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreamLinksBlock({ game }) {
  const visibleStreams = getVisibleStreamLinks(game);

  if (visibleStreams.length === 0) return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold">Stream</h2>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
          {visibleStreams.map(stream => (
            <a
              key={stream.id}
              href={normalizeExternalUrl(stream.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="snap-start shrink-0 w-20 rounded-2xl border border-border/50 bg-secondary/30 px-2 py-3 flex flex-col items-center text-center active:scale-[0.98] transition-transform"
            >
              <StreamProviderLogo stream={stream} size="w-11 h-11" />

              <span className="mt-2 text-[10px] font-black leading-tight line-clamp-2 min-h-[24px]">
                {getStreamName(stream)}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function PredictionStatRow({ label, count, percent }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-bold truncate">
          {label}
        </p>

        <p className="text-xs font-black text-primary">
          {percent}%
        </p>
      </div>

      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-[10px] text-muted-foreground mt-1">
        {count} {count === 1 ? 'Tipp' : 'Tipps'}
      </p>
    </div>
  );
}

function PredictionBlock({ game, home, away, predictions, currentPrediction, onSubmit, isSaving }) {
  if (game?.status === 'cancelled') return null;

  const predictionDisabled = game?.predictionEnabled === false;
  const predictionWindowOpen = isPredictionOpen(game);
  const userAlreadyPredicted = !!currentPrediction;
  const canPredict = predictionWindowOpen && !userAlreadyPredicted;

  const homeName = home?.shortName || home?.name || 'Heimteam';
  const awayName = away?.shortName || away?.name || 'Auswaertsteam';

  const homeTeamId = game?.homeTeamId || 'home';
  const awayTeamId = game?.awayTeamId || 'away';

  const stats = buildPredictionStats(predictions, homeTeamId, awayTeamId);
  const showStats = !predictionWindowOpen;

  const selectedLabel =
    currentPrediction?.selected_team_id === homeTeamId || currentPrediction?.selected_team_id === 'home'
      ? homeName
      : currentPrediction?.selected_team_id === awayTeamId || currentPrediction?.selected_team_id === 'away'
      ? awayName
      : '';

  const handleSubmit = selectedTeamId => {
    if (!canPredict) {
      toast.error('Du hast fuer dieses Spiel bereits getippt oder die Tippabgabe ist geschlossen.');
      return;
    }

    onSubmit({
      selected_team_id: selectedTeamId,
    });
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold">Spiel-Tipp</h2>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
  {predictionDisabled
    ? 'Das Tippspiel ist fuer dieses Spiel deaktiviert.'
    : canPredict
    ? 'Waehle vor Kickoff, wer das Spiel gewinnt.'
    : userAlreadyPredicted
    ? 'Dein Tipp ist gespeichert und kann nicht mehr geaendert werden.'
    : 'Tippabgabe geschlossen.'}
</p>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 rounded-full px-2 py-1">
            {stats.total} Tipps
          </span>
        </div>

        {canPredict && (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => handleSubmit(homeTeamId)}
        disabled={isSaving}
        className="min-h-[76px] rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Mein Tipp
        </p>

        <p className="text-sm font-black leading-tight mt-1 line-clamp-2">
          {homeName} gewinnt
        </p>
      </button>

      <button
        type="button"
        onClick={() => handleSubmit(awayTeamId)}
        disabled={isSaving}
        className="min-h-[76px] rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Mein Tipp
        </p>

        <p className="text-sm font-black leading-tight mt-1 line-clamp-2">
          {awayName} gewinnt
        </p>
      </button>
    </div>

    {isSaving && (
      <div className="flex justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    )}
  </div>
)}

        {userAlreadyPredicted && (
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Dein Tipp
            </p>

            <p className="text-lg font-black">
              {selectedLabel ? `${selectedLabel} gewinnt` : 'Tipp gespeichert'}
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Dieser Tipp ist gesperrt.
            </p>
          </div>
        )}

        {showStats && stats.total > 0 && (
          <div className="space-y-2 mt-3">
            <PredictionStatRow
              label={`${homeName} gewinnt`}
              count={stats.homeCount}
              percent={stats.homePercent}
            />

            <PredictionStatRow
              label={`${awayName} gewinnt`}
              count={stats.awayCount}
              percent={stats.awayPercent}
            />
          </div>
        )}

        {showStats && stats.total === 0 && (
          <div className="rounded-xl border border-border/40 bg-background/40 py-5 text-center mt-3">
            <p className="text-xs text-muted-foreground">
              Keine Tipps abgegeben.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


function GameLeaderRow({ title, homeLeader, awayLeader }) {
  const homeName = getLeaderName(homeLeader);
  const awayName = getLeaderName(awayLeader);
  const homeLine = getLeaderLine(homeLeader);
  const awayLine = getLeaderLine(awayLeader);

  if (homeName === '-' && awayName === '-' && !homeLine && !awayLine) return null;

  return (
    <div className="border-t border-white/10 first:border-t-0 py-4">
      <div className="text-center mb-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-red-500">
          {title}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black truncate text-white">
            {homeName}
          </p>

          {homeLine && (
            <p className="text-xs text-white/52 mt-0.5 truncate">
              {homeLine}
            </p>
          )}
        </div>

        <div className="min-w-0 text-right">
          <p className="text-sm font-black truncate text-white">
            {awayName}
          </p>

          {awayLine && (
            <p className="text-xs text-white/52 mt-0.5 truncate">
              {awayLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamStatCompareRow({ label, homeValue, awayValue, homeColor = '#2563eb', awayColor = '#ef4444' }) {
  const homeNumber = Number(homeValue || 0);
  const awayNumber = Number(awayValue || 0);
  const canGraph = Number.isFinite(homeNumber) && Number.isFinite(awayNumber);
  const max = canGraph ? Math.max(homeNumber, awayNumber, 1) : 1;

  const homeWidth = canGraph
    ? `${Math.max((homeNumber / max) * 100, homeNumber > 0 ? 8 : 0)}%`
    : '0%';

  const awayWidth = canGraph
    ? `${Math.max((awayNumber / max) * 100, awayNumber > 0 ? 8 : 0)}%`
    : '0%';

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-black tabular-nums min-w-10 text-white">
          {formatStatDisplay(homeValue)}
        </span>

        <span className="text-[10px] font-black uppercase tracking-wider text-white/48 text-center">
          {label}
        </span>

        <span className="text-xs font-black tabular-nums min-w-10 text-right text-white">
          {formatStatDisplay(awayValue)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full"
            style={{ width: homeWidth, backgroundColor: homeColor }}
          />
        </div>

        <div className="w-px h-4 bg-white/16" />

        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: awayWidth, backgroundColor: awayColor }}
          />
        </div>
      </div>
    </div>
  );
}

function TimeOfPossessionBlock({ homeName, awayName, homeTime, awayTime }) {
  if (!homeTime && !awayTime) return null;

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/72 p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-red-500" />
        <h2 className="text-sm font-black">
          Time of Possession
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold truncate text-white/62">
            {homeName}
          </span>
          <span className="text-sm font-black tabular-nums text-white">
            {homeTime || '-'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold truncate text-white/62">
            {awayName}
          </span>
          <span className="text-sm font-black tabular-nums text-white">
            {awayTime || '-'}
          </span>
        </div>
      </div>
    </div>
  );
}

function AfterGameStatisticsBlock({ game, stat, home, away }) {
  if (!isFinalGame(game)) return null;
  if (!hasGameStats(stat)) return null;

  const homeName = home?.shortName || home?.name || 'Home';
  const awayName = away?.shortName || away?.name || 'Away';

  const homeStats = stat.homeStats || {};
  const awayStats = stat.awayStats || {};
  const leaders = stat.leaders || {};
  const homeColor = home?.primaryColor || home?.colorPrimary || home?.teamColor || '#2563eb';
  const awayColor = away?.primaryColor || away?.colorPrimary || away?.teamColor || '#ef4444';
  
  return (
    <div className="px-4 pt-4 pb-2 space-y-3">
      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black/76 p-4 text-white shadow-[0_18px_42px_rgba(0,0,0,0.32)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(194,15,26,0.24),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(47,125,255,0.20),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-70" />
        <div className="relative flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="text-lg font-black italic leading-tight">
              After Game Statistics
            </h2>

            <p className="text-xs text-white/56 mt-0.5">
              Team Stats und Spieler-Statistiken aus der App.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-3">
        <div className="rounded-[24px] border border-white/10 bg-black/72 p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-black">
              Team Stats
            </h2>
          </div>

          <div className="space-y-4">
            <TeamStatCompareRow
              label="Total Yards"
              homeValue={getStatValue(homeStats, 'totalYards', 0)}
              awayValue={getStatValue(awayStats, 'totalYards', 0)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />

            <TeamStatCompareRow
              label="Passing Yards"
              homeValue={getStatValue(homeStats, 'passingYards', 0)}
              awayValue={getStatValue(awayStats, 'passingYards', 0)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />

            <TeamStatCompareRow
              label="Rushing Yards"
              homeValue={getStatValue(homeStats, 'rushingYards', 0)}
              awayValue={getStatValue(awayStats, 'rushingYards', 0)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />

            <TeamStatCompareRow
              label="Penalty Yards"
              homeValue={getStatValue(homeStats, 'penaltyYards', 0)}
              awayValue={getStatValue(awayStats, 'penaltyYards', 0)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />

            <TeamStatCompareRow
              label="3rd Down Conv."
              homeValue={formatThirdDown(homeStats)}
              awayValue={formatThirdDown(awayStats)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />

            <TeamStatCompareRow
              label="Turnovers"
              homeValue={getStatValue(homeStats, 'turnovers', 0)}
              awayValue={getStatValue(awayStats, 'turnovers', 0)}
                            homeColor={homeColor}
              awayColor={awayColor}
            />
          </div>
        </div>

        <TimeOfPossessionBlock
          homeName={homeName}
          awayName={awayName}
          homeTime={homeStats.timeOfPossession}
          awayTime={awayStats.timeOfPossession}
        />
      </div>
            {hasMeaningfulObjectValues(leaders) && (
        <div className="rounded-[24px] border border-white/10 bg-black/72 p-4 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-black">
              Spieler Statistiken
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/48 truncate">
                {homeName}
              </p>

              <p className="text-[10px] font-black uppercase tracking-wider text-white/48 truncate text-right">
                {awayName}
              </p>
            </div>

            <GameLeaderRow
              title="Passing"
              homeLeader={leaders.passing?.home}
              awayLeader={leaders.passing?.away}
            />

            <GameLeaderRow
              title="Rushing"
              homeLeader={leaders.rushing?.home}
              awayLeader={leaders.rushing?.away}
            />

            <GameLeaderRow
              title="Receiving"
              homeLeader={leaders.receiving?.home}
              awayLeader={leaders.receiving?.away}
            />

            <GameLeaderRow
              title="Defense"
              homeLeader={leaders.defense?.home}
              awayLeader={leaders.defense?.away}
            />
          </div>
        </div>
      )}

      {stat.source && (
        <p className="text-[10px] text-muted-foreground px-1">
          Quelle: {stat.source}
        </p>
      )}
    </div>
  );
}

function GameDayShotsBlock({ photos }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2">
            <Camera className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />

            <div>
              <h2 className="text-sm font-bold">
                GameDay Shots
              </h2>

              <p className="text-xs text-muted-foreground mt-0.5">
                Bilder, Eindruecke und Momente rund um dieses Spiel.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 rounded-full px-2 py-1">
            {photos.length}
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-secondary/20 px-4 py-8 text-center">
            <div className="w-11 h-11 rounded-2xl bg-background border border-border/50 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>

            <p className="text-sm font-bold">
              Noch keine GameDay Shots vorhanden
            </p>

            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Sobald Bilder zum Spiel verfuegbar sind, erscheinen sie hier.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {photos.map(photo => {
              const meta = parseMessage(photo.message);
              const imageUrl = meta.image_url || photo.imageUrl || '';
              const credit = meta.credit || '';
              const creditLink = meta.credit_link || meta.creditLink || '';
              const instagram = meta.instagram || '';
              const caption = meta.caption || '';

              return (
                <div
                  key={photo.id}
                  className="group rounded-2xl overflow-hidden border border-border/40 bg-secondary/20"
                >
                  <a
                    href={getImageUrl(imageUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block active:scale-[0.99] transition-transform"
                  >
                    <div className="aspect-[4/5] bg-background flex items-center justify-center overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={getImageUrl(imageUrl)}
                          alt={caption || credit || 'GameDay Shot'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </a>

                  {(credit || instagram || caption) && (
                    <div className="p-2">
                      {caption && (
                        <p className="text-[11px] font-semibold line-clamp-2">
                          {caption}
                        </p>
                      )}

                      {(credit || instagram) && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {credit && (
                            creditLink ? (
                              <a
                                href={normalizeExternalUrl(creditLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-muted-foreground hover:text-primary transition-colors truncate max-w-full"
                              >
                                Foto: {credit}
                              </a>
                            ) : (
                              <p className="text-[10px] text-muted-foreground truncate">
                                Foto: {credit}
                              </p>
                            )
                          )}

                          <InstagramCreditButton instagram={instagram} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotesBlock({ game }) {
  if (!game.notes) return null;

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="rounded-2xl border border-border/50 bg-card px-4 py-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
          Notizen
        </p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {game.notes}
        </p>
      </div>
    </div>
  );
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  const visitorId = useMemo(() => getOrCreateVisitorId(), []);

  const { data: game, isLoading: gameLoading } = useRealtimeQuery({
    queryKey: ['game', id],
    queryFn: async () => {
      const results = await base44.entities.Game.filter({ id });
      return results[0] || null;
    },
    enabled: !!id,
    entity: 'Game',
  });

  const { data: teams = [] } = useRealtimeQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
    entity: 'Team',
  });

  const { data: leagues = [] } = useRealtimeQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list('name'),
    entity: 'League',
  });

  const { data: allGames = [] } = useRealtimeQuery({
    queryKey: ['games'],
    queryFn: () => base44.entities.Game.list('-date'),
    entity: 'Game',
  });

    const { data: gameContentItems = [] } = useQuery({
    queryKey: ['game-content', id],
    queryFn: async () => {
      const all = await base44.entities.AppUpdate.list('-created_date', 2000);

      return all.filter(item => {
        if (![
          GAMEDAY_PHOTO_VERSION,
          GAME_PREDICTION_VERSION,
        ].includes(item.version)) {
          return false;
        }

        const meta = parseMessage(item.message);
        const linkedGameId =
          meta.game_id ||
          meta.gameId ||
          item.game_id ||
          item.gameId ||
          '';

        return String(linkedGameId) === String(id);
      });
    },
    enabled: !!id,
  });

  const { data: gameStatistic = null } = useQuery({
  queryKey: ['game-statistic', id],
  queryFn: async () => {
    const entity = base44.entities.ClubFollow;

    if (!entity) return null;

    const stats = await entity.filter({ gameId: id });

    return stats.find(item =>
      item.type === 'game_statistic' ||
      item.statType === 'game_statistic' ||
      item.gameId === id
    ) || null;
  },
  enabled: !!id,
});

  const teamMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map(l => [l.id, l])), [leagues]);

  const homeReal = game?.homeTeamId ? teamMap[game.homeTeamId] : null;
  const awayReal = game?.awayTeamId ? teamMap[game.awayTeamId] : null;

  const home = homeReal || PlaceholderTeam({ label: game?.homeTeamPlaceholder || 'Teilnehmer offen' });
  const away = awayReal || PlaceholderTeam({ label: game?.awayTeamPlaceholder || 'Teilnehmer offen' });
  const league = game ? leagueMap[game.leagueId] : null;

  const hasBothRealTeams = !!(game?.homeTeamId && game?.awayTeamId && homeReal && awayReal);
  const isCancelled = game?.status === 'cancelled';

  const gamedayShots = useMemo(() => {
    return gameContentItems
      .filter(item => item.version === GAMEDAY_PHOTO_VERSION && item.isActive !== false)
      .sort((a, b) => {
        const aMeta = parseMessage(a.message);
        const bMeta = parseMessage(b.message);

        return Number(aMeta.sort_order || 0) - Number(bMeta.sort_order || 0);
      });
  }, [gameContentItems]);

  const predictions = useMemo(() => {
    return gameContentItems
      .filter(item => item.version === GAME_PREDICTION_VERSION && item.isActive !== false);
  }, [gameContentItems]);

  const showStatisticsTab = isFinalGame(game) && hasGameStats(gameStatistic);
  const selectedDetailTab = activeDetailTab === 'statistics' && !showStatisticsTab
    ? 'overview'
    : activeDetailTab;
    
  const currentPrediction = useMemo(() => {
    const item = predictions.find(prediction => {
      const meta = parseMessage(prediction.message);
      return meta.visitor_id === visitorId;
    });

    if (!item) return null;

    const meta = parseMessage(item.message);

    return {
      id: item.id,
      selected_team_id: meta.selected_team_id || '',
    };
  }, [predictions, visitorId]);

  const invalidateGameContent = () => {
    queryClient.invalidateQueries({ queryKey: ['game-content', id] });
    queryClient.invalidateQueries({ queryKey: ['appUpdates'] });
  };

  const savePredictionMutation = useMutation({
    mutationFn: async ({ selected_team_id }) => {
      if (currentPrediction?.id) {
        throw new Error('Du hast fuer dieses Spiel bereits getippt.');
      }

      if (!isPredictionOpen(game)) {
        throw new Error('Die Tippabgabe ist geschlossen.');
      }

      return base44.entities.AppUpdate.create({
        title: 'Game Prediction',
        message: JSON.stringify({
          game_id: id,
          visitor_id: visitorId,
          selected_team_id,
          created_at: new Date().toISOString(),
        }),
        version: GAME_PREDICTION_VERSION,
        isActive: true,
        showAsPopup: false,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      invalidateGameContent();
      toast.success('Tipp gespeichert');
    },
    onError: error => {
      toast.error(error.message || 'Tipp konnte nicht gespeichert werden');
    },
  });

  useSetHeader({ mode: 'game' });

  if (gameLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <p className="text-muted-foreground">Spiel nicht gefunden.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/match-center')}>
          Zurueck
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-32">
      {hasBothRealTeams ? (
        <ScoreHero game={game} home={homeReal} away={awayReal} league={league} />
      ) : (
        <PlaceholderScoreHero game={game} home={home} away={away} league={league} />
      )}

      <CancelledGameNotice game={game} />

      {!isCancelled && <StreamLinksBlock game={game} />}

      <div className="px-4 pt-4">
        <div className={`grid gap-2 rounded-[22px] border border-white/10 bg-black/72 p-1 shadow-[0_14px_30px_rgba(0,0,0,0.26)] ${showStatisticsTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={() => setActiveDetailTab('overview')}
            className={`h-10 rounded-xl text-xs font-black transition-colors ${
              selectedDetailTab === 'overview'
                ? 'bg-red-700 text-white shadow-[0_10px_22px_rgba(194,15,26,0.28)]'
                : 'text-white/52 hover:text-white'
            }`}
          >
            Uebersicht
          </button>

          {showStatisticsTab && (
            <button
              type="button"
              onClick={() => setActiveDetailTab('statistics')}
              className={`h-10 rounded-xl text-xs font-black transition-colors ${
                selectedDetailTab === 'statistics'
                  ? 'bg-red-700 text-white shadow-[0_10px_22px_rgba(194,15,26,0.28)]'
                  : 'text-white/52 hover:text-white'
              }`}
            >
              Statistiken
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveDetailTab('info')}
            className={`h-10 rounded-xl text-xs font-black transition-colors ${
              selectedDetailTab === 'info'
                ? 'bg-red-700 text-white shadow-[0_10px_22px_rgba(194,15,26,0.28)]'
                : 'text-white/52 hover:text-white'
            } ${showStatisticsTab ? '' : 'col-span-1'}`}
          >
            Infos
          </button>
        </div>
      </div>

      {selectedDetailTab === 'overview' && (
        <>
          {!isCancelled && (
            <PredictionBlock
              game={game}
              home={home}
              away={away}
              predictions={predictions}
              currentPrediction={currentPrediction}
              onSubmit={data => savePredictionMutation.mutate(data)}
              isSaving={savePredictionMutation.isPending}
            />
          )}

          {!isCancelled && gamedayShots.length > 0 && (
            <GameDayShotsBlock photos={gamedayShots} />
          )}

          {hasBothRealTeams && !isCancelled && (
            <>
              <TeamForm game={game} teams={teamMap} allGames={allGames} />
              <HeadToHead game={game} teams={teamMap} allGames={allGames} />
            </>
          )}
        </>
      )}

      {selectedDetailTab === 'statistics' && showStatisticsTab && (
        <AfterGameStatisticsBlock
          game={game}
          stat={gameStatistic}
          home={home}
          away={away}
        />
      )}

      {selectedDetailTab === 'info' && (
        <>
          <MatchInfo game={game} league={league} />
          <NotesBlock game={game} />
        </>
      )}
    </div>
  );
}
