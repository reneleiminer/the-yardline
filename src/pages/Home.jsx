import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, ExternalLink, Play, Radio } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getEffectiveGameStatus, getGameDate } from "@/lib/gameStatusUtils";
import { getImageUrl } from "@/lib/imageUtils";
import { useAuth } from "@/lib/AuthContext";
import ScoreDisplay from "@/components/ui/ScoreDisplay";

const HIGHLIGHT_VERSION = "game_highlight";
const GAMEDAY_SHOT_VERSION = "gameday_photo";
const PODCAST_VERSION = "podcast_feature";
const AD_BANNER_VERSION = "ad_banner";

function parseJsonMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getGameUpdatedDate(game) {
  const raw =
    game?.updatedAtUtc ||
    game?.updatedAt ||
    game?.updated_date ||
    game?.createdAtUtc ||
    game?.created_date ||
    "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinLastHours(date, hours) {
  if (!date) return false;
  return Date.now() - date.getTime() <= hours * 60 * 60 * 1000;
}

function hasFinalScore(game) {
  return getEffectiveGameStatus(game) === "final" && hasPlayableScore(game);
}

function hasPlayableScore(game) {
  return (
    game.scoreHome != null &&
    game.scoreAway != null &&
    game.scoreHome !== "" &&
    game.scoreAway !== "" &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}



function toRgba(color, alpha) {
  if (!color) return `rgba(255,255,255,${alpha})`;
  const value = String(color).trim();

  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map(char => char + char).join("");
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

  if (value.startsWith("rgb(")) {
    return value.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }

  return value;
}

function getTeamName(team, fallback) {
  return team?.name || team?.shortName || fallback || "Offen";
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function normalizePresentedByLabel(label) {
  return String(label || "")
    .trim()
    .replace(/^(presented\s+by|by)\s+/i, "")
    .trim();
}

function TeamLogo({ team, className = "h-16 w-16" }) {
  if (!team?.logo) return null;

  return (
    <img
      src={getImageUrl(team.logo)}
      alt={team.name || ""}
      className={`${className} object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]`}
      loading="lazy"
    />
  );
}

function StatusPill({ game }) {
  const status = getEffectiveGameStatus(game);
  if (status === "scheduled") return null;

  const label = {
    live: "LIVE",
    final: "FINAL",
    cancelled: "ABGESAGT",
  }[status] || "";

  const className = status === "live"
    ? "bg-red-700 text-white animate-pulse"
    : status === "final"
      ? "bg-slate-950 text-white"
      : "bg-orange-600 text-white";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${className}`}>
      {label}
    </span>
  );
}

function ColorGameCard({ game, teamsById, leaguesById, compact = false }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = (status === "final" || status === "live") && hasPlayableScore(game);
  const homeColor = getTeamColor(home, league?.primaryColor || "#013369");
  const awayColor = getTeamColor(away, "#c20f1a");

  const statusLabel =
    status === "live"
      ? "LIVE"
      : status === "final"
        ? "FINAL"
        : status === "cancelled"
          ? "ABGESAGT"
          : "KICKOFF";

  const centerBlock = showScore ? (
    <>
      <ScoreDisplay
        homeScore={game.scoreHome ?? 0}
        awayScore={game.scoreAway ?? 0}
        dark
        size="md"
      />
      <span className={`mt-1 text-[8px] font-black uppercase tracking-[0.2em] sm:mt-2 sm:text-[10px] sm:tracking-[0.22em] ${status === "live" ? "text-[#ff2338]" : "text-white/78"}`}>
        {status === "live" && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#ff2338] align-middle shadow-[0_0_10px_rgba(255,35,56,0.9)]" />}
        {statusLabel}
      </span>
    </>
  ) : status === "cancelled" ? (
    <>
      <span className="text-[16px] font-black uppercase tracking-[0.16em] text-white/82 sm:text-[18px] sm:tracking-[0.18em]">VS</span>
      <span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-orange-200 sm:mt-2 sm:text-[10px] sm:tracking-[0.22em]">ABGESAGT</span>
    </>
  ) : (
    <>
      <span className="text-[24px] font-black leading-none text-white tabular-nums drop-shadow-[0_3px_10px_rgba(0,0,0,0.38)] sm:text-[42px]">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "--:--"}</span>
      <span className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/78 sm:mt-2 sm:text-[10px] sm:tracking-[0.22em]">{kickoff ? format(kickoff, "dd.MM.", { locale: de }) : statusLabel}</span>
    </>
  );

  return (
    <Link
      to={`/game/${game.id}`}
      className={`group block overflow-hidden rounded-[22px] border border-white/10 bg-black text-white shadow-[0_18px_44px_rgba(0,0,0,0.34)] transition-transform active:scale-[0.99] sm:rounded-[28px] ${compact ? "min-w-[82vw] sm:min-w-[420px]" : ""}`}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 grid grid-cols-2">
          <div style={{ background: homeColor }} />
          <div style={{ background: awayColor }} />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-white/12 via-transparent to-black/12" />
        <div className="pointer-events-none absolute inset-y-4 left-1/2 z-10 w-px -translate-x-1/2 bg-white/18 sm:inset-y-5" />

        <div className="relative z-20 flex min-h-[128px] flex-col justify-center gap-2 px-3 py-3 sm:min-h-[218px] sm:gap-4 sm:px-6 sm:py-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
            <div className="flex min-w-0 justify-center">
              <TeamLogo team={home} className="h-[58px] w-[60px] shrink-0 object-contain opacity-95 drop-shadow-[0_8px_18px_rgba(0,0,0,0.38)] sm:h-[124px] sm:w-[122px]" />
            </div>

            <div className="flex min-w-[92px] flex-col items-center justify-center px-1 text-center sm:min-w-[148px]">
              {centerBlock}
            </div>

            <div className="flex min-w-0 justify-center">
              <TeamLogo team={away} className="h-[58px] w-[60px] shrink-0 object-contain opacity-95 drop-shadow-[0_8px_18px_rgba(0,0,0,0.38)] sm:h-[124px] sm:w-[122px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <p className="line-clamp-2 hyphens-auto whitespace-normal break-words text-center text-[14px] font-black italic leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:text-[28px] sm:leading-[1.06]">
              {homeName}
            </p>
            <p className="line-clamp-2 hyphens-auto whitespace-normal break-words text-center text-[14px] font-black italic leading-[1.04] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:text-[28px] sm:leading-[1.06]">
              {awayName}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
function SmallGameCard({ game, teamsById, leaguesById }) {
  return <ColorGameCard game={game} teamsById={teamsById} leaguesById={leaguesById} compact />;
}

function FavoriteNextGameCard({ game, favoriteTeam, teamsById, leaguesById, favoriteRecord, favoriteRank }) {
  if (!game || !favoriteTeam) return null;

  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = (status === "live" || status === "final") && hasPlayableScore(game);
  const isFavoriteHome = game.homeTeamId === favoriteTeam.id;
  const opponent = isFavoriteHome ? away : home;
  const opponentName = getTeamName(
    opponent,
    isFavoriteHome
      ? game.awayTeamNameSnapshot || game.awayTeamPlaceholder
      : game.homeTeamNameSnapshot || game.homeTeamPlaceholder
  );
  const favoriteColor = getTeamColor(favoriteTeam, league?.primaryColor || "#013369");
  const opponentColor = getTeamColor(opponent, "#c20f1a");
  const record = favoriteRecord || { wins: 0, losses: 0, ties: 0, played: 0 };
  const recordLabel = `${record.wins || 0}-${record.losses || 0}${record.ties ? `-${record.ties}` : ""}`;
  const rankLabel = favoriteRank ? `#${favoriteRank}` : "-";
  const nextLabel = status === "live" ? "Live" : status === "final" ? "Letztes Spiel" : "Nächstes Spiel";
  const opponentPrefix = isFavoriteHome ? "vs" : "@";

  return (
    <Link
      to={`/game/${game.id}`}
      className="block overflow-hidden rounded-[20px] border border-white/10 bg-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.26)] active:scale-[0.99]"
    >
      <div
        className="relative min-h-[96px] overflow-hidden px-3 py-3 sm:min-h-[112px] sm:px-4"
        style={{
          background: `linear-gradient(135deg, ${toRgba(favoriteColor, 0.72)}, rgba(0,0,0,0.88) 54%, ${toRgba(opponentColor, 0.46)})`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0_1px,transparent_1px_22px)] opacity-30" />
        <div className="relative z-10 grid grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {favoriteTeam.logo && (
              <img
                src={getImageUrl(favoriteTeam.logo)}
                alt=""
                className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_7px_16px_rgba(0,0,0,0.38)] sm:h-14 sm:w-14"
                loading="lazy"
              />
            )}
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55">Dein Team</p>
              <p className="truncate text-[15px] font-black italic leading-tight sm:text-[17px]">
                {favoriteTeam.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-white/48">
                {league?.shortName || league?.name || "Liga"}
              </p>
            </div>
          </div>

          <div className="grid min-w-[86px] grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/46 text-center backdrop-blur">
            <div className="px-2 py-2">
              <p className="text-[9px] font-black uppercase text-white/45">Platz</p>
              <p className="text-lg font-black leading-none text-white">{rankLabel}</p>
            </div>
            <div className="border-l border-white/10 px-2 py-2">
              <p className="text-[9px] font-black uppercase text-white/45">Bilanz</p>
              <p className="text-lg font-black leading-none text-white">{recordLabel}</p>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ff2338]">{nextLabel}</p>
            <div className="mt-1 flex items-center justify-end gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-black italic leading-tight sm:text-[15px]">
                  {opponentPrefix} {opponentName}
                </p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white/58">
                  {showScore ? `${game.scoreHome ?? 0}:${game.scoreAway ?? 0}` : kickoff ? `${format(kickoff, "dd.MM.", { locale: de })} · ${format(kickoff, "HH:mm", { locale: de })}` : "Kickoff offen"}
                </p>
              </div>
              {opponent?.logo && (
                <img
                  src={getImageUrl(opponent.logo)}
                  alt=""
                  className="h-9 w-9 shrink-0 object-contain opacity-95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)] sm:h-10 sm:w-10"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}


function SectionTitle({ title, to }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="yardline-heading text-[22px] sm:text-2xl">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="mt-1 flex items-center gap-1 text-xs font-black text-red-700">
          Alle
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function HorizontalRail({ children }) {
  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain scroll-px-4 snap-x snap-mandatory px-4 pb-2 hide-scrollbar">
      <div className="flex items-stretch gap-4">
        {children}
      </div>
    </div>
  );
}

function EmptyCard({ label }) {
  return (
    <p className="py-6 text-center text-lg font-black uppercase italic leading-tight text-white">
      {label}
    </p>
  );
}

function normalizeHighlight(item) {
  const meta = parseJsonMessage(item.message);
  const createdAt =
    meta.created_at ||
    meta.createdAt ||
    item.createdAtUtc ||
    item.created_date ||
    item.updatedAtUtc ||
    item.updated_date ||
    "";

  return {
    id: item.id,
    title: item.title || meta.title || "Game Highlight",
    imageUrl: meta.thumbnail_url || meta.thumbnailUrl || item.imageUrl || "",
    url: meta.external_video_url || meta.externalVideoUrl || meta.preview_video_url || meta.previewVideoUrl || meta.url || "",
    gameId: meta.game_id || meta.gameId || "",
    leagueLabel: meta.league_name || meta.leagueName || meta.league || meta.source_name || meta.sourceName || "Highlight",
    sourceName: meta.source_name || meta.sourceName || "",
    duration: meta.duration || meta.video_duration || meta.videoDuration || "",
    createdAt,
    active: item.isActive !== false && meta.active !== false,
  };
}

function isFreshContent(item, minDate) {
  const createdAt = new Date(item.createdAt || 0);
  return Number.isNaN(createdAt.getTime()) || !isBefore(createdAt, minDate);
}

function normalizeAdBanner(item) {
  const meta = parseJsonMessage(item.message);

  return {
    id: item.id,
    title: meta.title || item.title || "Werbung",
    imageUrl: meta.image_url || meta.imageUrl || item.imageUrl || "",
    linkUrl: meta.link_url || meta.linkUrl || "",
    position: meta.position || "after_highlights",
    active: item.isActive !== false && meta.active !== false,
    startDate: meta.start_date || meta.startDate || "",
    endDate: meta.end_date || meta.endDate || "",
    sortOrder: Number(meta.sort_order ?? meta.sortOrder ?? 0),
  };
}

function isBannerInWindow(banner, now = new Date()) {
  if (!banner.active) return false;

  if (banner.startDate) {
    const start = new Date(`${banner.startDate}T00:00:00`);
    if (!Number.isNaN(start.getTime()) && start > now) return false;
  }

  if (banner.endDate) {
    const end = new Date(`${banner.endDate}T23:59:59`);
    if (!Number.isNaN(end.getTime()) && end < now) return false;
  }

  return true;
}

function normalizeBannerPosition(position) {
  if (position === "before_spotlight") return "after_news";
  if (position === "after_upcoming") return "after_gotw";
  return position || "after_highlights";
}

function AdBannerCard({ banner }) {
  if (!banner?.imageUrl && !banner?.title) return null;

  const content = (
    <div className="group relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-black text-white shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
      <div className="relative aspect-[16/7] w-full overflow-hidden">
        {banner.imageUrl ? (
          <img
            src={getImageUrl(banner.imageUrl)}
            alt={banner.title || "Werbung"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(194,15,26,0.88),rgba(0,0,0,0.86)_48%,rgba(47,125,255,0.66))]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(105deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_18px)] opacity-20" />

        <span className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-[#ff2338] backdrop-blur-md">
          Werbung
        </span>

        {banner.linkUrl && (
          <span className="absolute right-4 top-4 z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-red-700 shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-105">
            <ExternalLink className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        {content}
      </a>
    );
  }

  return content;
}

function AdBannerSlot({ banners, position }) {
  const slotBanners = banners.filter((banner) => normalizeBannerPosition(banner.position) === position);
  if (slotBanners.length === 0) return null;

  return (
    <section>
      <div className="space-y-3">
        {slotBanners.map((banner) => (
          <AdBannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  );
}

function HighlightCard({ item, priority = false }) {
  const wrapperClass = "block shrink-0 snap-start basis-[82vw] max-w-[82vw] sm:basis-[520px] sm:max-w-[520px]";

  const content = (
    <div className="group relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-black text-white shadow-[0_18px_36px_rgba(0,0,0,0.34)]">
      {item.imageUrl ? (
        <img
          src={getImageUrl(item.imageUrl)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,91,255,0.35),transparent_35%),linear-gradient(135deg,#000,#07111f)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/12 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/78 to-transparent" />

      <div className="absolute left-3 top-3 right-16 flex items-center gap-2">
        <span className="max-w-full truncate rounded-full bg-red-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          {item.leagueLabel}
        </span>
        {item.sourceName && item.sourceName !== item.leagueLabel && (
          <span className="hidden rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur sm:inline-flex">
            {item.sourceName}
          </span>
        )}
      </div>

      {item.url ? (
        <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 shadow-[0_0_24px_rgba(0,91,255,0.28)] backdrop-blur transition-transform duration-300 group-hover:scale-105">
          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-base font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {item.title}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
            Zum Highlight
          </span>
          <div className="flex items-center gap-2">
            {item.duration ? (
              <span className="rounded-lg bg-black/55 px-2 py-1 text-[10px] font-black text-white/90 backdrop-blur">
                {item.duration}
              </span>
            ) : null}
            {item.url ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                <ExternalLink className="h-3.5 w-3.5 text-red-700" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className={wrapperClass}>
        {content}
      </a>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}

function NewsCard({ post }) {
  const imageUrl = post.imageUrl || post.coverImageUrl || post.thumbnailUrl || "";
  const meta = parseJsonMessage(post.message);
  const authorName = meta.author_name || meta.authorName || post.authorUsername || "";

  return (
    <Link to={`/post/${post.id}`} className="block overflow-hidden rounded-[22px] border border-white/10 bg-black/78 text-white shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      {imageUrl && (
        <img src={getImageUrl(imageUrl)} alt="" className="aspect-square w-full object-cover" loading="lazy" />
      )}
      <div className="p-3">
        <p className="text-[10px] font-black uppercase text-[#ff2338]">
          {post.type === "transfer" ? "Transfer" : "News"}
        </p>
        <h3 className="mt-1 text-sm font-black leading-tight">{post.title || "News"}</h3>
        {authorName && (
          <p className="mt-2 truncate text-[10px] font-bold uppercase text-white/45">
            Presented by {authorName}
          </p>
        )}
      </div>
    </Link>
  );
}

function TransferCard({ post }) {
  const imageUrl = post.imageUrl || post.coverImageUrl || post.thumbnailUrl || "";
  const meta = parseJsonMessage(post.message);
  const player = meta.transfer_player || meta.transferPlayer || post.title || "Transfer";
  const authorName = meta.author_name || meta.authorName || post.authorUsername || "";

  return (
    <Link to={`/post/${post.id}`} className="group block min-w-[72vw] max-w-[72vw] overflow-hidden rounded-[28px] border border-white/10 bg-black text-white shadow-[0_18px_38px_rgba(0,0,0,0.34)] sm:min-w-[330px] sm:max-w-[330px]">
      <div className="relative min-h-[150px] overflow-hidden p-4">
        {imageUrl ? (
          <img src={getImageUrl(imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-42 transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(194,15,26,0.84),rgba(0,0,0,0.82)_48%,rgba(47,125,255,0.62))]" />
        <div className="relative z-10 flex min-h-[118px] flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/68">Transfer Wire</p>
            <h3 className="mt-2 text-2xl font-black italic leading-none">{player}</h3>
          </div>
          <div>
            <p className="text-sm font-black leading-tight">{post.title || "Neuer Transfer"}</p>
            {authorName && <p className="mt-2 text-[10px] font-bold uppercase text-white/48">Presented by {authorName}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function normalizePodcast(item) {
  const meta = parseJsonMessage(item.message);

  return {
    spotifyUrl: meta.spotify_url || meta.spotifyUrl || meta.url || meta.link_url || meta.linkUrl || "",
    podcastTitle: meta.podcast_title || meta.podcastTitle || meta.show_title || meta.showTitle || "Football Germany Podcast",
    episodeTitle: meta.episode_title || meta.episodeTitle || item.title || "",
    thumbnailUrl: meta.thumbnail_url || meta.thumbnailUrl || item.imageUrl || "",
    partnerName: meta.partner_name || meta.partnerName || meta.author_name || meta.authorName || "Football Germany",
    updatedAt: meta.updated_at || meta.updatedAt || item.updatedAtUtc || item.updated_date || item.createdAtUtc || item.created_date || "",
    active: item.isActive !== false && meta.active !== false,
  };
}

function PodcastCard({ podcast }) {
  if (!podcast?.spotifyUrl) return null;

  return (
    <a href={podcast.spotifyUrl} target="_blank" rel="noopener noreferrer" className="group relative grid min-h-[132px] grid-cols-[96px_1fr] gap-3 overflow-hidden rounded-[26px] border border-white/10 bg-black/78 p-3 text-white shadow-[0_18px_38px_rgba(0,0,0,0.34)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(194,15,26,0.26),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(47,125,255,0.24),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)] opacity-70" />

      <div className="relative h-24 w-24 overflow-hidden rounded-[22px] border border-white/12 bg-white/8">
        {podcast.thumbnailUrl ? (
          <img src={getImageUrl(podcast.thumbnailUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Radio className="h-8 w-8 text-red-500" />
          </div>
        )}
      </div>
      <div className="relative min-w-0 self-center">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-red-700 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            Podcast
          </span>
          <span className="truncate text-[10px] font-black uppercase tracking-wide text-[#2f7dff]">
            {podcast.partnerName}
          </span>
        </div>
        <h3 className="text-base font-black leading-tight text-white">
          {podcast.episodeTitle || podcast.podcastTitle}
        </h3>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-bold text-white/52">
            {podcast.podcastTitle}
          </p>
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white text-red-700 transition-transform group-hover:scale-105">
            <Radio className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  );
}

function normalizeShot(item) {
  const meta = parseJsonMessage(item.message);
  const createdAt =
    meta.created_at ||
    meta.createdAt ||
    item.createdAtUtc ||
    item.created_date ||
    item.updatedAtUtc ||
    item.updated_date ||
    "";

  return {
    id: item.id,
    gameId: meta.game_id || meta.gameId || "",
    teamId: meta.team_id || meta.teamId || "",
    teamName: meta.team_name || meta.teamName || "",
    teamLogo: meta.team_logo || meta.teamLogo || "",
    imageUrl: meta.image_url || meta.imageUrl || item.imageUrl || "",
    caption: meta.caption || item.title || "",
    sortOrder: Number(meta.sort_order ?? meta.sortOrder ?? 0),
    updatedAt: meta.updated_at || meta.updatedAt || item.updatedAtUtc || item.updated_date || item.createdAtUtc || item.created_date || "",
    createdAt,
    active: item.isActive !== false && meta.active !== false,
  };
}

function ShotCard({ shot }) {
  return (
    <div className="min-w-[42vw] max-w-[42vw] overflow-hidden rounded-[22px] border border-white/10 bg-black/72 text-white shadow-[0_12px_28px_rgba(0,0,0,0.26)] backdrop-blur sm:min-w-[220px] sm:max-w-[220px]">
      <img src={getImageUrl(shot.imageUrl)} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
      <div className="p-3">
        {shot.teamName && (
          <div className="mb-2 flex items-center gap-2">
            {shot.teamLogo && (
              <img src={getImageUrl(shot.teamLogo)} alt="" className="h-5 w-5 rounded bg-white object-contain p-0.5" loading="lazy" />
            )}
            <p className="truncate text-[10px] font-black uppercase text-[#ff2338]">{shot.teamName}</p>
          </div>
        )}
        <p className="text-xs font-black leading-tight">{shot.caption || "GameDay Shot"}</p>
      </div>
    </div>
  );
}

function buildTeamRecords(games) {
  const records = new Map();

  const ensure = (teamId) => {
    if (!teamId) return null;
    if (!records.has(teamId)) records.set(teamId, { teamId, wins: 0, losses: 0, ties: 0, played: 0 });
    return records.get(teamId);
  };

  games.filter(hasFinalScore).forEach((game) => {
    const home = ensure(game.homeTeamId);
    const away = ensure(game.awayTeamId);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    if (Number(game.scoreHome) > Number(game.scoreAway)) {
      home.wins += 1;
      away.losses += 1;
    } else if (Number(game.scoreAway) > Number(game.scoreHome)) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.ties += 1;
      away.ties += 1;
    }
  });

  return records;
}

function StreakCard({ item }) {
  const color = getTeamColor(item.team, "#013369");

  return (
    <Link
      to={`/team/${item.team.id}`}
      className="block min-w-[86vw] max-w-[86vw] overflow-hidden rounded-[28px] text-white shadow-[0_12px_30px_rgba(15,23,42,0.14)] sm:min-w-[360px] sm:max-w-[360px]"
      style={{ background: color }}
    >
      <div className="relative flex min-h-[148px] items-center gap-3 overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
        <TeamLogo team={item.team} className="relative z-10 h-16 w-16 flex-shrink-0 sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1">
          <p className="relative z-10 text-lg font-black leading-[1.08] sm:text-xl">{item.team.name}</p>
          <p className="relative z-10 mt-1 text-[10px] font-black uppercase tracking-wide text-white/65">
            Unbeaten Run
          </p>
        </div>
        <div
          className="relative z-10 rounded-2xl bg-white px-4 py-3 text-center text-black"
        >
          <p className="text-2xl font-black leading-none">W{item.record.wins}</p>
          <p className="text-[8px] font-black uppercase text-black/45">Serie</p>
        </div>
      </div>
    </Link>
  );
}


function isDeletedOrBlockedAuthor(author) {
  return (
    !author ||
    author.deletionStatus === "pending" ||
    author.deletionStatus === "completed" ||
    author.status === "deleted" ||
    author.status === "blocked_deleted" ||
    author.status === "banned" ||
    author.status === "blocked" ||
    author.status === "inactive"
  );
}

function isPostVisibleByAuthor(post, appUsersById) {
  if (post?.isHidden || post?.isDeleted || post?.isActive === false) return false;
  if (!post?.authorId) return true;

  return !isDeletedOrBlockedAuthor(appUsersById.get(post.authorId));
}

function GameOfWeekTitle({ label }) {
  const cleanLabel = normalizePresentedByLabel(label);

  return (
    <div className="mb-3">
      <div className="min-w-0">
        <div className="min-w-0">
          <p className="yardline-heading flex flex-wrap items-center gap-x-2 gap-y-2">
            <span>Game of the Week</span>
            {cleanLabel && (
              <span
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase leading-none shadow-[0_8px_20px_rgba(0,0,0,0.25)] backdrop-blur sm:text-[11px]"
              >
                <span className="text-[#ff2338]">Presented by</span>
                <span className="text-[#2f7dff]">{cleanLabel}</span>
              </span>
            )}
          </p>

          <div className="yardline-title-bars" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { games, teams, leagues } = useGlobalData();
  const { appUserSnapshot } = useAuth();
  const queryClient = useQueryClient();

  const { data: appUpdates = [] } = useQuery({
    queryKey: ["home-overview-updates"],
    queryFn: () => base44.entities.AppUpdate.list("-created_date", 2000),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["home-overview-news"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 20),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const { data: appUsers = [] } = useQuery({
    queryKey: ["home-overview-app-users"],
    queryFn: () => base44.entities.AppUser.list("-created_date", 500),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const appUsersById = useMemo(() => new Map(appUsers.map((user) => [user.id, user])), [appUsers]);
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);
  const teamRecords = useMemo(() => buildTeamRecords(games), [games]);

  const gameOfTheWeek = useMemo(() => {
    return [...games]
      .filter((game) => game.isGameOfTheWeek === true)
      .filter((game) => getEffectiveGameStatus(game) !== "cancelled")
      .sort((a, b) => {
        const selectedA = new Date(a.gameOfTheWeekSelectedAtUtc || 0).getTime();
        const selectedB = new Date(b.gameOfTheWeekSelectedAtUtc || 0).getTime();
        if (selectedA !== selectedB) return selectedB - selectedA;
        return (getGameDate(b)?.getTime() || 0) - (getGameDate(a)?.getTime() || 0);
      })[0] || null;
  }, [games]);

  const gameOfTheWeekLabel = gameOfTheWeek?.gameOfTheWeekLabel || gameOfTheWeek?.gameOfTheWeekPresentedBy || "EuroFBShow";
  const liveGames = useMemo(() => {
    return games
      .filter((game) => getEffectiveGameStatus(game) === "live")
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 6);
  }, [games]);

  const favoriteTeam = useMemo(() => {
    return teamsById.get(appUserSnapshot?.favoriteTeamId || "") || null;
  }, [appUserSnapshot?.favoriteTeamId, teamsById]);

  const favoriteRecord = useMemo(() => {
    if (!favoriteTeam?.id) return null;
    return teamRecords.get(favoriteTeam.id) || { teamId: favoriteTeam.id, wins: 0, losses: 0, ties: 0, played: 0 };
  }, [favoriteTeam?.id, teamRecords]);

  const favoriteRank = useMemo(() => {
    if (!favoriteTeam?.id || !favoriteTeam?.leagueId) return null;

    const leagueTeams = teams.filter((team) => team.leagueId === favoriteTeam.leagueId);
    const rankedTeams = leagueTeams
      .map((team) => ({
        team,
        record: teamRecords.get(team.id) || { wins: 0, losses: 0, ties: 0, played: 0 },
      }))
      .sort((a, b) => {
        const pctA = a.record.played > 0 ? a.record.wins / a.record.played : 0;
        const pctB = b.record.played > 0 ? b.record.wins / b.record.played : 0;
        if (pctB !== pctA) return pctB - pctA;
        if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
        if (a.record.losses !== b.record.losses) return a.record.losses - b.record.losses;
        return String(a.team.name || "").localeCompare(String(b.team.name || ""));
      });

    const index = rankedTeams.findIndex((item) => item.team.id === favoriteTeam.id);
    return index >= 0 ? index + 1 : null;
  }, [favoriteTeam?.id, favoriteTeam?.leagueId, teamRecords, teams]);

  const favoriteNextGame = useMemo(() => {
    if (!favoriteTeam?.id) return null;

    const teamGames = games.filter((game) =>
      game.homeTeamId === favoriteTeam.id ||
      game.awayTeamId === favoriteTeam.id
    );

    const liveGame = teamGames
      .filter((game) => getEffectiveGameStatus(game) === "live")
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))[0];

    if (liveGame) return liveGame;

    const recentFinal = teamGames
      .filter((game) => getEffectiveGameStatus(game) === "final")
      .map((game) => ({
        game,
        updatedAt: getGameUpdatedDate(game),
        kickoff: getGameDate(game),
      }))
      .filter((item) => isWithinLastHours(item.updatedAt || item.kickoff, 24))
      .sort((a, b) => (b.updatedAt?.getTime() || b.kickoff?.getTime() || 0) - (a.updatedAt?.getTime() || a.kickoff?.getTime() || 0))[0]?.game;

    if (recentFinal) return recentFinal;

    const now = new Date();

    return teamGames
      .filter((game) => !["final", "cancelled", "live"].includes(getEffectiveGameStatus(game)))
      .map((game) => ({ game, date: getGameDate(game) }))
      .filter((item) => item.date && item.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.game || null;
  }, [favoriteTeam?.id, games]);

  const highlights = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === HIGHLIGHT_VERSION && item.isActive !== false)
      .map(normalizeHighlight)
      .filter((item) => item.active && isFreshContent(item, sevenDaysAgo))
      .slice(0, 4);
  }, [appUpdates, sevenDaysAgo]);

  const podcast = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === PODCAST_VERSION && item.isActive !== false)
      .map(normalizePodcast)
      .filter((item) => item.active && item.spotifyUrl)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null;
  }, [appUpdates]);

  const news = useMemo(() => {
    return posts
      .filter((post) => post.type === "news")
      .filter((post) => isPostVisibleByAuthor(post, appUsersById))
      .sort((a, b) => {
        const dateA = new Date(a.publishedAtUtc || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.publishedAtUtc || b.createdAtUtc || b.created_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [appUsersById, posts]);

  const transfers = useMemo(() => {
    return posts
      .filter((post) => post.type === "transfer")
      .filter((post) => isPostVisibleByAuthor(post, appUsersById))
      .sort((a, b) => {
        const dateA = new Date(a.publishedAtUtc || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.publishedAtUtc || b.createdAtUtc || b.created_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [appUsersById, posts]);

  const shots = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === GAMEDAY_SHOT_VERSION && item.isActive !== false)
      .map(normalizeShot)
      .filter((shot) => shot.active && shot.imageUrl)
      .filter((shot) => isFreshContent(shot, sevenDaysAgo))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      })
      .slice(0, 4);
  }, [appUpdates, sevenDaysAgo]);

  const adBanners = useMemo(() => {
    const now = new Date();

    return appUpdates
      .filter((item) => item.version === AD_BANNER_VERSION)
      .map(normalizeAdBanner)
      .filter((banner) => isBannerInWindow(banner, now))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
  }, [appUpdates]);

  useEffect(() => {
    const staleShots = appUpdates
      .filter((item) => item.version === GAMEDAY_SHOT_VERSION)
      .map(normalizeShot);

    const staleHighlights = appUpdates
      .filter((item) => item.version === HIGHLIGHT_VERSION)
      .map(normalizeHighlight);

    const staleItems = [...staleShots, ...staleHighlights].filter((item) => {
      const createdAt = new Date(item.createdAt || 0);
      return item.id && !Number.isNaN(createdAt.getTime()) && isBefore(createdAt, sevenDaysAgo);
    });

    if (staleItems.length === 0) return;

    Promise.allSettled(staleItems.map((item) => base44.entities.AppUpdate.delete(item.id)))
      .then(() => queryClient.invalidateQueries({ queryKey: ["home-overview-updates"] }));
  }, [appUpdates, queryClient, sevenDaysAgo]);

  const undefeatedTeams = useMemo(() => {
    return Array.from(teamRecords.values())
      .filter((record) => record.played > 0 && record.losses === 0)
      .map((record) => ({ record, team: teamsById.get(record.teamId) }))
      .filter((item) => item.team)
      .sort((a, b) => b.record.wins - a.record.wins)
      .slice(0, 4);
  }, [teamRecords, teamsById]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="space-y-7">
        {favoriteNextGame && (
          <FavoriteNextGameCard
            game={favoriteNextGame}
            favoriteTeam={favoriteTeam}
            favoriteRecord={favoriteRecord}
            favoriteRank={favoriteRank}
            teamsById={teamsById}
            leaguesById={leaguesById}
          />
        )}

        <section>
          <SectionTitle title="News" to="/feed" />
          {news.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {news.map((post) => <NewsCard key={post.id} post={post} />)}
            </div>
          ) : (
            <EmptyCard label="Keine News" />
          )}
        </section>

        <AdBannerSlot banners={adBanners} position="after_news" />

        {gameOfTheWeek && (
          <section>
            <GameOfWeekTitle label={gameOfTheWeekLabel} />
            <SmallGameCard game={gameOfTheWeek} teamsById={teamsById} leaguesById={leaguesById} />
          </section>
        )}

        <AdBannerSlot banners={adBanners} position="after_gotw" />

        {podcast && (
          <section>
            <SectionTitle title="Podcast" />
            <PodcastCard podcast={podcast} />
          </section>
        )}

        <AdBannerSlot banners={adBanners} position="after_podcast" />

        <section>
          <SectionTitle title="Transfers" to="/feed" />
          {transfers.length > 0 ? (
            <HorizontalRail>
              {transfers.map((post) => <TransferCard key={post.id} post={post} />)}
            </HorizontalRail>
          ) : (
            <EmptyCard label="Keine Transfers" />
          )}
        </section>

        {undefeatedTeams.length > 0 && (
          <section>
            <SectionTitle title="Siegesserien" />
            <HorizontalRail>
              {undefeatedTeams.map((item) => <StreakCard key={item.team.id} item={item} />)}
            </HorizontalRail>
          </section>
        )}

        <section>
          <SectionTitle title="GameDay Shots" />
          {shots.length > 0 ? (
            <HorizontalRail>
              {shots.map((shot) => <ShotCard key={shot.id} shot={shot} />)}
            </HorizontalRail>
          ) : (
            <EmptyCard label="Noch keine GameDay Shots" />
          )}
        </section>

        <AdBannerSlot banners={adBanners} position="after_shots" />

        <section>
          <SectionTitle title="Game Highlights" to="/highlights" />
          {highlights.length > 0 ? (
            <HorizontalRail>
              {highlights.map((item, index) => <HighlightCard key={item.id} item={item} priority={index === 0} />)}
            </HorizontalRail>
          ) : (
            <EmptyCard label="Keine Highlights" />
          )}
        </section>

        <AdBannerSlot banners={adBanners} position="after_highlights" />
      </div>
    </div>
  );
}
