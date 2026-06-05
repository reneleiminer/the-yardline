import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Flame,
  Image as ImageIcon,
  Instagram,
  Play,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";

const HIGHLIGHT_VERSION = "game_highlight";
const COMMUNITY_CLIP_VERSION = "community_clip";
const SPOTLIGHT_VERSION = "team_spotlight";
const AD_BANNER_VERSION = "ad_banner";
const GAMEDAY_SHOT_VERSION = "gameday_photo";

function normalizeUrl(value) {
  return String(value || "").trim();
}

function normalizeInstagramUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const handle = trimmed
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/\?.*$/, "")
    .replace(/\/$/, "");

  if (!handle) return "";

  return `https://instagram.com/${handle}`;
}

function getInstagramLabel(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed) || /^www\.instagram\.com\//i.test(trimmed) || /^instagram\.com\//i.test(trimmed)) {
    const cleaned = trimmed
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^www\.instagram\.com\//i, "")
      .replace(/^instagram\.com\//i, "")
      .replace(/\?.*$/, "")
      .replace(/\/$/, "");

    return cleaned ? `@${cleaned}` : "Instagram";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function InstagramCreditButton({ instagram, compact = false }) {
  const url = normalizeInstagramUrl(instagram);
  const label = getInstagramLabel(instagram);

  if (!url || !label) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={event => event.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full border border-pink-400/25 bg-pink-500/15 text-pink-100 hover:bg-pink-500/25 transition-colors ${
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[11px] font-bold"
      }`}
      aria-label={`Instagram ${label} öffnen`}
    >
      <Instagram className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span className="truncate max-w-[92px]">{label}</span>
    </a>
  );
}

function parseJsonMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {
      description: message,
    };
  }
}

function normalizeHighlight(item) {
  const meta = parseJsonMessage(item.message);

  return {
    ...item,
    title: item.title || "",
    description: meta.description || "",
    thumbnail_url: meta.thumbnail_url || item.imageUrl || "",
    external_video_url: meta.external_video_url || "",
    source_name: meta.source_name || "",
    league_id: meta.league_id || "",
    game_id: meta.game_id || "",
    team_id: meta.team_id || "",
    date: meta.date || "",
    active: item.isActive !== false && meta.active !== false,
    preview_video_url: meta.preview_video_url || "",
  };
}


function isNewContent(item, maxAgeHours = 24) {
  const rawDate =
    item?.date ||
    item?.createdAtUtc ||
    item?.created_date ||
    item?.updatedAtUtc ||
    item?.updated_date ||
    '';

  if (!rawDate) return false;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return false;

  const ageMs = Date.now() - date.getTime();
  if (ageMs < 0) return true;

  return ageMs <= maxAgeHours * 60 * 60 * 1000;
}

function normalizeCommunityClip(item) {
  const meta = parseJsonMessage(item.message);

  return {
    ...item,
    title: item.title || "",
    description: meta.description || "",
    thumbnail_url: meta.thumbnail_url || item.imageUrl || "",
    external_video_url: meta.external_video_url || "",
    source_name: meta.source_name || "Community Clip",
    league_id: meta.league_id || "",
    game_id: meta.game_id || "",
    team_id: meta.team_id || "",
    date: meta.date || "",
    active: item.isActive !== false && meta.active !== false,
    preview_video_url: meta.preview_video_url || "",
  };
}

function normalizeSpotlight(item) {
  const meta = parseJsonMessage(item.message);

  return {
    ...item,
    team_id: meta.team_id || "",
    start_date: meta.start_date || "",
    end_date: meta.end_date || "",
    headline: meta.headline || item.title || "",
    description: meta.description || "",
    active: item.isActive !== false && meta.active !== false,
  };
}

function normalizeAdBanner(item) {
  const meta = parseJsonMessage(item.message);

  return {
    ...item,
    title: item.title || meta.title || "",
    image_url: meta.image_url || item.imageUrl || "",
    link_url: meta.link_url || "",
    position: meta.position || "after_highlights",
    active: item.isActive !== false && meta.active !== false,
    start_date: meta.start_date || "",
    end_date: meta.end_date || "",
    sort_order: Number(meta.sort_order || 0),
  };
}

function normalizeGameDayShot(item) {
  const meta = parseJsonMessage(item.message);

  return {
    ...item,
    game_id: meta.game_id || "",
    image_url: meta.image_url || item.imageUrl || "",
    credit: meta.credit || "",
    credit_link: meta.credit_link || meta.creditLink || "",
    instagram: meta.instagram || "",
    caption: meta.caption || item.title || "",
    sort_order: Number(meta.sort_order || 0),
    active: item.isActive !== false && meta.active !== false,
    created_at: meta.created_at || item.createdAtUtc || item.created_date || "",
  };
}

function getGameDate(game) {
  if (game?.date) {
    const rawTime = game.time || game.kickoffTime || "00:00";
    const [year, month, day] = String(game.date).split("-").map(Number);
    const [hour, minute] = String(rawTime).split(":").map(Number);

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
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}


function getEffectiveGameStatus(game) {
  if (!game) return "scheduled";
  if (game.status === "cancelled") return "cancelled";
  if (game.status === "final") return "final";
  if (game.status === "live") return "live";

  const date = getGameDate(game);
  if (!date) return game.status || "scheduled";

  if ((game.status || "scheduled") === "scheduled" && new Date().getTime() >= date.getTime()) {
    return "live";
  }

  return game.status || "scheduled";
}

function getTeam(teamId, teamsById) {
  return teamId ? teamsById.get(teamId) : null;
}

function getLeague(leagueId, leaguesById) {
  return leagueId ? leaguesById.get(leagueId) : null;
}

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || "Offen";
}

function getTeamColor(team, fallback = "#2563eb") {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function getLeaguePriority(league) {
  const raw = league?.level ?? league?.tier ?? league?.priority ?? league?.sortOrder ?? 50;
  const value = Number(raw);

  return Number.isFinite(value) ? value : 50;
}

function hasStream(game) {
  const status = getEffectiveGameStatus(game);
  if (status === "final" || status === "cancelled") return false;
  if (game.streamEnabled === false) return false;
  if (game.streamUrl) return true;

  return Array.isArray(game.streamLinks)
    ? game.streamLinks.some((link) => link?.url && link?.enabled !== false && link?.status !== "rejected")
    : false;
}

function hasFinalScore(game) {
  return (
    game.status === "final" &&
    game.scoreHome != null &&
    game.scoreAway != null &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

function getScoreDiff(game) {
  return Math.abs(Number(game.scoreHome || 0) - Number(game.scoreAway || 0));
}

function getTotalPoints(game) {
  return Number(game.scoreHome || 0) + Number(game.scoreAway || 0);
}

function isSpecialGame(game) {
  const value = [
    game.roundName,
    game.stage,
    game.type,
    game.competitionName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    game.isCompetitionGame ||
    game.competitionId ||
    game.tournamentId ||
    value.includes("playoff") ||
    value.includes("final") ||
    value.includes("bowl")
  );
}

function getWeekWindowFromStart(weekStart) {
  return {
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  };
}

function findLatestCompletedGameWeek(games, today) {
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

  for (let offset = 0; offset < 10; offset += 1) {
    const weekStart = subDays(currentWeekStart, offset * 7);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const weekGames = games.filter((game) => {
      const date = getGameDate(game);
      if (!date) return false;

      return isWithinInterval(date, {
        start: weekStart,
        end: weekEnd,
      });
    });

    if (weekGames.length === 0) continue;

    const hasOpenGames = weekGames.some((game) =>
      getEffectiveGameStatus(game) === "scheduled" ||
      getEffectiveGameStatus(game) === "live"
    );

    const finalGames = weekGames.filter(hasFinalScore);

    if (hasOpenGames) continue;
    if (finalGames.length === 0) continue;

    return {
      start: weekStart,
      end: weekEnd,
      games: finalGames,
    };
  }

  return null;
}

function buildTeamRecords(games) {
  const records = new Map();

  const ensure = (teamId, leagueId) => {
    if (!teamId) return null;

    if (!records.has(teamId)) {
      records.set(teamId, {
        teamId,
        leagueId,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        played: 0,
      });
    }

    const record = records.get(teamId);

    if (!record.leagueId && leagueId) {
      record.leagueId = leagueId;
    }

    return record;
  };

  games.filter(hasFinalScore).forEach(game => {
    const home = ensure(game.homeTeamId, game.leagueId);
    const away = ensure(game.awayTeamId, game.leagueId);

    if (!home || !away) return;

    const homeScore = Number(game.scoreHome || 0);
    const awayScore = Number(game.scoreAway || 0);

    home.played += 1;
    away.played += 1;
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.losses += 1;
      away.losses += 1;
    }
  });

  return records;
}

function buildLeagueRanks(records, leaguesById) {
  const byLeague = new Map();

  Array.from(records.values()).forEach(record => {
    const key = record.leagueId || "unknown";

    if (!byLeague.has(key)) {
      byLeague.set(key, []);
    }

    byLeague.get(key).push(record);
  });

  const ranks = new Map();

  byLeague.forEach((rows, leagueId) => {
    rows
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;

        const leagueA = leaguesById.get(a.leagueId);
        const leagueB = leaguesById.get(b.leagueId);

        return getLeaguePriority(leagueA) - getLeaguePriority(leagueB);
      })
      .forEach((record, index) => {
        ranks.set(`${leagueId}:${record.teamId}`, index + 1);
      });
  });

  return ranks;
}

function isActiveInDateRange(item, today) {
  if (!item.active) return false;

  const start = item.start_date ? startOfDay(parseISO(item.start_date)) : null;
  const end = item.end_date ? startOfDay(parseISO(item.end_date)) : null;

  if (start && isBefore(today, start)) return false;
  if (end && isAfter(today, addDays(end, 1))) return false;

  return true;
}

function highlightMatchesCurrentFilter(highlight, selectedLeagueId, query, teamsById, leaguesById, gamesById) {
  if (selectedLeagueId && highlight.league_id && highlight.league_id !== selectedLeagueId) return false;

  if (selectedLeagueId && !highlight.league_id) {
    const game = gamesById.get(highlight.game_id);
    const team = teamsById.get(highlight.team_id);

    if (game?.leagueId !== selectedLeagueId && team?.leagueId !== selectedLeagueId) return false;
  }

  if (!query) return true;

  const league = leaguesById.get(highlight.league_id);
  const team = teamsById.get(highlight.team_id);
  const game = gamesById.get(highlight.game_id);
  const home = game ? teamsById.get(game.homeTeamId) : null;
  const away = game ? teamsById.get(game.awayTeamId) : null;

  const haystack = [
    highlight.title,
    highlight.description,
    highlight.source_name,
    league?.name,
    league?.shortName,
    team?.name,
    team?.shortName,
    home?.name,
    home?.shortName,
    away?.name,
    away?.shortName,
    game?.homeTeamPlaceholder,
    game?.awayTeamPlaceholder,
    game?.roundName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function TeamMark({ team, fallback, size = "md" }) {
  const sizeClass = size === "lg" ? "w-12 h-12 rounded-2xl" : "w-8 h-8 rounded-xl";

  if (team?.logo) {
    return (
      <img
        src={getImageUrl(team.logo)}
        alt={team.name || ""}
        className={`${sizeClass} object-contain bg-black/25 border border-white/10 p-1`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`${sizeClass} bg-secondary border border-white/10 flex items-center justify-center text-[10px] font-black`}>
      {team?.shortName?.[0] || team?.name?.[0] || fallback?.[0] || "?"}
    </div>
  );
}

function LeagueLogo({ league, active }) {
  return (
    <div
      className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transition-all ${
        active
          ? "bg-primary/20 ring-2 ring-primary"
          : "bg-transparent ring-1 ring-white/10"
      }`}
    >
      {league.logo ? (
        <img
          src={getImageUrl(league.logo)}
          alt={league.name || ""}
          className="w-9 h-9 object-contain"
          loading="lazy"
        />
      ) : (
        <span className="text-xs font-black">
          {league.shortName?.[0] || league.name?.[0] || "L"}
        </span>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, to }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-primary flex-shrink-0" />}
        <h2 className="text-base font-black leading-tight truncate">{title}</h2>
      </div>

      {to && (
        <Link to={to} className="text-xs text-primary font-bold flex items-center gap-1 flex-shrink-0">
          Alle
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function PlaceholderCard({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-5 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function LeagueCarousel({ leagues, selectedLeagueId, onToggle }) {
  return (
    <section className="pt-2 overflow-hidden">
      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 px-4 pt-1 pb-2 snap-x w-max">
          {leagues.length > 0 ? (
            leagues.map((league) => {
              const active = selectedLeagueId === league.id;

              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => onToggle(league.id)}
                  className="snap-start shrink-0 flex flex-col items-center gap-1.5 min-w-[54px]"
                >
                  <LeagueLogo league={league} active={active} />

                  <span className={`text-[10px] font-black max-w-[58px] truncate ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {league.shortName || league.name || "Liga"}
                  </span>
                </button>
              );
            })
          ) : (
            <PlaceholderCard label="Keine Ligen" />
          )}
        </div>
      </div>
    </section>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <section className="px-4 pt-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Suchen nach Liga, Team, Spiel oder Wettbewerb"
          className="w-full h-11 rounded-2xl bg-card border border-border/60 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
      </div>
    </section>
  );
}

function AdBanner({ banner }) {
  const linkUrl = normalizeUrl(banner.link_url);
  const imageUrl = normalizeUrl(banner.image_url);

  if (!imageUrl && !banner.title) return null;

  const content = (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#070B12] shadow-[0_18px_42px_rgba(0,0,0,0.35)]">
      {imageUrl ? (
        <div className="relative">
          <div className="absolute left-3 top-3 z-10">
            <span className="rounded-full bg-black/70 border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Werbung
            </span>
          </div>

          <div className="aspect-[16/7] w-full bg-black">
            <img
              src={getImageUrl(imageUrl)}
              alt={banner.title || "Werbung"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      ) : (
        <div className="min-h-[90px] flex items-center px-4 py-4">
          <span className="rounded-full bg-black/70 border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Werbung
          </span>
        </div>
      )}
    </div>
  );

  if (linkUrl.startsWith("http")) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  if (linkUrl) {
    return (
      <Link to={linkUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function AdBannerSlot({ banners, position }) {
  const items = banners.filter(banner => banner.position === position);

  if (items.length === 0) return null;

  return (
    <section className="px-4 pt-5">
      <div className="space-y-2">
        {items.map(banner => (
          <AdBanner key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  );
}

function LiveGameCard({ game, teamsById, leaguesById }) {
  const home = getTeam(game.homeTeamId, teamsById);
  const away = getTeam(game.awayTeamId, teamsById);
  const league = getLeague(game.leagueId, leaguesById);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);

  const homeColor = getTeamColor(home, "#ef4444");
  const awayColor = getTeamColor(away, "#2563eb");

  return (
    <Link
      to={`/game/${game.id}`}
      className="snap-start shrink-0 w-[210px] rounded-2xl border border-red-500/25 p-3 active:scale-[0.98] transition-transform overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${homeColor}26 0%, #101722 45%, ${awayColor}20 100%)`,
        boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] text-muted-foreground truncate">
          {league?.shortName || league?.name || "Live"}
        </p>

        <span className="text-[9px] font-black text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-2 py-0.5">
          LIVE
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
          <TeamMark team={home} fallback={homeName} />
          <span className="text-xs font-black truncate">{homeName}</span>
          <span className="text-sm font-black">{game.scoreHome ?? 0}</span>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
          <TeamMark team={away} fallback={awayName} />
          <span className="text-xs font-black truncate">{awayName}</span>
          <span className="text-sm font-black">{game.scoreAway ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}

function GameOfWeekCard({ game, teamsById, leaguesById, label }) {
  if (!game) return null;

  const home = getTeam(game.homeTeamId, teamsById);
  const away = getTeam(game.awayTeamId, teamsById);
  const league = getLeague(game.leagueId, leaguesById);
  const date = getGameDate(game);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, "#2563eb");
  const awayColor = getTeamColor(away, "#ef4444");

  return (
    <section className="px-4 pt-6">
      <SectionTitle icon={Star} title="Game of the Week" />

      <Link
        to={`/game/${game.id}`}
        className="block rounded-2xl border border-primary/20 overflow-hidden active:scale-[0.99] transition-transform"
        style={{
          background: `linear-gradient(135deg, ${homeColor}18 0%, #101722 48%, ${awayColor}18 100%)`,
          boxShadow: `inset 4px 0 0 ${homeColor}, inset -4px 0 0 ${awayColor}`,
        }}
      >
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[10px] text-muted-foreground truncate">
              {league?.shortName || league?.name || "Spiel"}
            </p>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {label && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-white rounded-full px-2 py-0.5">
                  {label}
                </span>
              )}

              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <div className="min-w-0 flex items-center gap-2">
              <TeamMark team={home} fallback={homeName} />
              <span className="text-xs font-black truncate">{homeName}</span>
            </div>

            <div className="text-center px-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black tabular-nums leading-none">
                  {game.scoreHome ?? 0}
                </span>

                <span className="text-lg font-black text-muted-foreground">
                  :
                </span>

                <span className="text-xl font-black tabular-nums leading-none">
                  {game.scoreAway ?? 0}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {date ? format(date, "dd.MM.", { locale: de }) : "Final"}
              </p>
            </div>

            <div className="min-w-0 flex items-center justify-end gap-2">
              <span className="text-xs font-black truncate text-right">{awayName}</span>
              <TeamMark team={away} fallback={awayName} />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function HighlightReelCard({ highlight, teamsById, leaguesById, gamesById, wide = false }) {
  const previewVideoUrl = normalizeUrl(highlight.preview_video_url);
  const thumbnailUrl = normalizeUrl(highlight.thumbnail_url);
  const targetUrl = normalizeUrl(highlight.external_video_url) || "/highlights";
  const league = getLeague(highlight.league_id, leaguesById);
  const team = getTeam(highlight.team_id, teamsById);
  const game = gamesById.get(highlight.game_id);
  const gameLeague = game ? getLeague(game.leagueId, leaguesById) : null;

  const leagueLabel =
    league?.shortName ||
    league?.name ||
    gameLeague?.shortName ||
    gameLeague?.name ||
    highlight.source_name ||
    "Highlight";

  const sourceLine = [
    highlight.source_name || "Game Highlight",
    team?.shortName || team?.name,
  ].filter(Boolean).join(" · ");

  const isNew = isNewContent(highlight, 24);

  const content = wide ? (
    <div className="relative snap-start shrink-0 w-[286px] sm:w-[340px] rounded-2xl border border-primary/25 bg-black overflow-hidden active:scale-[0.99] transition-transform shadow-[0_0_0_1px_rgba(0,91,255,0.16),0_18px_44px_rgba(0,0,0,0.55)]">
      <div className="aspect-video w-full">
        {previewVideoUrl ? (
          <video
            src={previewVideoUrl}
            poster={thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : thumbnailUrl ? (
          <img
            src={getImageUrl(thumbnailUrl)}
            alt={highlight.title || ""}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(0,91,255,0.35),transparent_35%),linear-gradient(135deg,#000,#07111f)]" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="absolute left-3 top-3 right-16 flex items-center gap-1.5">
        <span className="max-w-full truncate rounded-full bg-primary px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(0,91,255,0.55)]">
          {leagueLabel}
        </span>

        {isNew && (
          <span className="rounded-full bg-red-500/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-lg">
            Neu
          </span>
        )}
      </div>

      <div className="absolute right-3 top-3 w-11 h-11 rounded-full bg-black/55 border border-white/20 backdrop-blur flex items-center justify-center shadow-[0_0_24px_rgba(0,91,255,0.28)]">
        <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
      </div>

      <div className="absolute left-3 right-3 bottom-3">
        <p className="text-sm sm:text-base font-black leading-tight line-clamp-2 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {highlight.title || "Highlight"}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Zum Highlight
          </span>

          {sourceLine && (
            <span className="text-[10px] text-white/62 truncate text-right min-w-0">
              {sourceLine}
            </span>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="relative snap-start shrink-0 w-[132px] rounded-2xl border border-white/10 bg-black overflow-hidden active:scale-[0.98] transition-transform">
      <div style={{ aspectRatio: "9 / 16" }}>
        {previewVideoUrl ? (
          <video
            src={previewVideoUrl}
            poster={thumbnailUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : thumbnailUrl ? (
          <img
            src={getImageUrl(thumbnailUrl)}
            alt={highlight.title || ""}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-black" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {isNew && (
        <div className="absolute left-2 top-2">
          <span className="rounded-full bg-red-500/95 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-lg">
            Neu
          </span>
        </div>
      )}

      {!previewVideoUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      <div className="absolute left-2 right-2 bottom-2">
        <p className="text-[11px] font-black leading-tight line-clamp-2">
          {highlight.title || "Highlight"}
        </p>
        <p className="text-[9px] text-white/65 mt-1 truncate">
          {sourceLine || leagueLabel}
        </p>
      </div>
    </div>
  );

  if (targetUrl.startsWith("http")) {
    return (
      <a href={targetUrl} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link to={targetUrl}>
      {content}
    </Link>
  );
}

function GameDayShotStoryModal({ item, teamsById, leaguesById, onClose }) {
  const [index, setIndex] = useState(0);

  if (!item) return null;

  const shots = item.shots || [];
  const shot = shots[index];
  const game = item.game;

  const home = getTeam(game.homeTeamId, teamsById);
  const away = getTeam(game.awayTeamId, teamsById);
  const league = getLeague(game.leagueId, leaguesById);
  const date = getGameDate(game);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);

  const goPrev = () => {
    setIndex(current => (current <= 0 ? shots.length - 1 : current - 1));
  };

  const goNext = () => {
    setIndex(current => (current >= shots.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">
            GameDay Shots
          </p>

          <p className="text-sm font-black truncate">
            {homeName} vs {awayName}
          </p>

          <p className="text-[10px] text-white/55 truncate">
            {[league?.shortName || league?.name, date ? format(date, "dd.MM.yyyy", { locale: de }) : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white font-black"
          aria-label="Schließen"
        >
          ×
        </button>
      </div>

      <div className="px-4 pb-2 flex gap-1">
        {shots.map((entry, dotIndex) => (
          <div
            key={entry.id || dotIndex}
            className={`h-1 rounded-full flex-1 ${
              dotIndex <= index ? "bg-white" : "bg-white/25"
            }`}
          />
        ))}
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        {shot?.image_url ? (
          <img
            src={getImageUrl(shot.image_url)}
            alt={shot.caption || "GameDay Shot"}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-white/40" />
          </div>
        )}

        {shots.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 top-0 bottom-0 w-1/3"
              aria-label="Vorheriges Bild"
            />

            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-0 bottom-0 w-1/3"
              aria-label="Nächstes Bild"
            />
          </>
        )}
      </div>

      {(shot?.caption || shot?.credit || shot?.instagram) && (
        <div className="px-4 pt-3 pb-[calc(18px+env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/90 to-transparent">
          {shot.caption && (
            <p className="text-sm font-bold leading-relaxed">
              {shot.caption}
            </p>
          )}

          {(shot.credit || shot.instagram) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {shot.credit && (
                shot.credit_link ? (
                  <a
                    href={normalizeUrl(shot.credit_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/65 hover:text-white transition-colors"
                  >
                    Foto: {shot.credit}
                  </a>
                ) : (
                  <p className="text-xs text-white/60">
                    Foto: {shot.credit}
                  </p>
                )
              )}

              <InstagramCreditButton instagram={shot.instagram} />
            </div>
          )}

          <p className="text-[10px] text-white/45 mt-2">
            {index + 1} / {shots.length}
          </p>
        </div>
      )}
    </div>
  );
}

function GameDayShotsReelCard({ item, teamsById, leaguesById, onOpen }) {
  const { game, shots } = item;

  const home = getTeam(game.homeTeamId, teamsById);
  const away = getTeam(game.awayTeamId, teamsById);
  const league = getLeague(game.leagueId, leaguesById);
  const date = getGameDate(game);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);

  const cover = shots[0];
  const coverUrl = normalizeUrl(cover?.image_url);

  return (
    <div className="relative snap-start shrink-0 w-[132px]">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative w-full rounded-2xl border border-white/10 bg-black overflow-hidden active:scale-[0.98] transition-transform text-left"
      >
        <div style={{ aspectRatio: "9 / 16" }}>
          {coverUrl ? (
            <img
              src={getImageUrl(coverUrl)}
              alt={cover?.caption || "GameDay Shot"}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-black" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-transparent" />

        <div className="absolute top-2 left-2">
          <span className="rounded-full bg-black/70 border border-white/15 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            {shots.length} Shots
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg">
            <Camera className="w-5 h-5" />
          </div>
        </div>

        <div className="absolute left-2 right-2 bottom-2">
          <p className="text-[11px] font-black leading-tight line-clamp-2">
            {homeName} vs {awayName}
          </p>

          <p className="text-[9px] text-white/65 mt-1 truncate">
            {[league?.shortName || league?.name, date ? format(date, "dd.MM.", { locale: de }) : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </button>

      {cover?.instagram && (
        <div className="absolute top-2 right-2 z-10">
          <InstagramCreditButton instagram={cover.instagram} compact />
        </div>
      )}
    </div>
  );
}

function UndefeatedTeamCard({ item, leaguesById }) {
  const { team, record } = item;
  const league = getLeague(record.leagueId || team.leagueId, leaguesById);
  const color = getTeamColor(team, "#2563eb");

  return (
    <Link
      to={`/team/${team.id}`}
      className="snap-start shrink-0 w-[168px] rounded-2xl border border-white/10 bg-card p-3 active:scale-[0.98] transition-transform overflow-hidden"
      style={{
        boxShadow: `inset 4px 0 0 ${color}`,
      }}
    >
      <div className="flex items-center gap-2">
        <TeamMark team={team} fallback={team.name} />
        <div className="min-w-0">
          <p className="text-xs font-black truncate">{team.shortName || team.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {league?.shortName || league?.name || "Liga"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-lg font-black tabular-nums">
          W{record.wins}
        </span>

        <span className="text-[9px] font-black rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-2 py-0.5">
          HOT
        </span>
      </div>
    </Link>
  );
}

function UpcomingGameCard({ game, teamsById, leaguesById }) {
  const home = getTeam(game.homeTeamId, teamsById);
  const away = getTeam(game.awayTeamId, teamsById);
  const league = getLeague(game.leagueId, leaguesById);
  const date = getGameDate(game);

  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, "#2563eb");
  const awayColor = getTeamColor(away, "#ef4444");

  return (
    <Link
      to={`/game/${game.id}`}
      className="snap-start shrink-0 w-[286px] rounded-2xl border border-white/10 p-3 active:scale-[0.99] transition-transform overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${homeColor}20 0%, #101722 45%, ${awayColor}18 100%)`,
        boxShadow: `inset 5px 0 0 ${homeColor}, inset -5px 0 0 ${awayColor}, 0 10px 24px rgba(0,0,0,0.22)`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">
            {league?.shortName || league?.name || "Spiel"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {date ? format(date, "dd.MM. · HH:mm", { locale: de }) : "Termin offen"}
          </p>
        </div>

        {hasStream(game) && <Radio className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <div className="min-w-0 flex flex-col items-center text-center">
          <TeamMark team={home} fallback={homeName} size="lg" />
          <span className="text-[11px] font-black leading-tight text-center mt-2 whitespace-normal break-words line-clamp-2">
            {homeName}
          </span>
        </div>

        <span className="text-xs font-black text-muted-foreground rounded-xl border border-white/10 px-2 py-1">
          VS
        </span>

        <div className="min-w-0 flex flex-col items-center text-center">
          <TeamMark team={away} fallback={awayName} size="lg" />
          <span className="text-[11px] font-black leading-tight text-center mt-2 whitespace-normal break-words line-clamp-2">
            {awayName}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TeamSpotlightCard({ spotlight, team, league, record, nextGames, teamsById }) {
  if (!spotlight || !team) return null;

  const color = getTeamColor(team, "#2563eb");
  const secondary = team.secondaryColor || team.colorSecondary || "#0f172a";
  const headline = spotlight.headline || "Team Spotlight";

  return (
    <section className="px-4 pt-6 pb-4">
      <SectionTitle icon={Sparkles} title="Team Spotlight" />

      <Link
        to={`/team/${team.id}`}
        className="block rounded-2xl border border-white/10 overflow-hidden active:scale-[0.99] transition-transform"
        style={{
          background: `radial-gradient(circle at 18% 18%, ${color}44 0%, transparent 34%), linear-gradient(135deg, ${secondary} 0%, #101722 52%, ${color}24 100%)`,
          boxShadow: `inset 5px 0 0 ${color}`,
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-black/25 border border-white/10 flex items-center justify-center p-2 flex-shrink-0">
              {team.logo ? (
                <img
                  src={getImageUrl(team.logo)}
                  alt={team.name || ""}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              ) : (
                <span className="text-2xl font-black">
                  {team.shortName?.[0] || team.name?.[0] || "T"}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                {headline}
              </p>

              <h2 className="text-xl font-black leading-tight truncate mt-1">
                {team.name}
              </h2>

              <p className="text-xs text-muted-foreground mt-1 truncate">
                {league?.shortName || league?.name || "Team"}
                {record?.played > 0 ? ` · ${record.wins}-${record.losses}` : ""}
              </p>
            </div>
          </div>

          {spotlight.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-4 line-clamp-3">
              {spotlight.description}
            </p>
          )}

          {nextGames.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
                Nächstes Spiel
              </p>

              {nextGames.slice(0, 2).map(game => {
                const isHome = game.homeTeamId === team.id;
                const opponent = getTeam(isHome ? game.awayTeamId : game.homeTeamId, teamsById);
                const date = getGameDate(game);

                return (
                  <div key={game.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold truncate">
                      {isHome ? "vs" : "@"} {getTeamName(opponent, "Offen")}
                    </span>

                    <span className="text-muted-foreground flex-shrink-0">
                      {date ? format(date, "dd.MM.", { locale: de }) : "offen"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-primary">
            Team ansehen
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    </section>
  );
}

function RailSection({ icon, title, to, children, emptyLabel, hideWhenEmpty = false }) {
  if (!children && hideWhenEmpty) return null;

  return (
    <section className="px-4 pt-6">
      <SectionTitle icon={icon} title={title} to={to} />

      {children ? (
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
          {children}
        </div>
      ) : (
        <PlaceholderCard label={emptyLabel} />
      )}
    </section>
  );
}

export default function Home() {
  const { leagues, teams, games, tournaments } = useGlobalData();

  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeShotStory, setActiveShotStory] = useState(null);

  const { data: homeAppUpdates = [] } = useQuery({
    queryKey: ["home-app-updates"],
    queryFn: async () => {
      return await base44.entities.AppUpdate.list("-created_date");
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const highlights = useMemo(() => {
    return homeAppUpdates
      .filter(item =>
        item.version === HIGHLIGHT_VERSION &&
        item.isActive !== false
      )
      .map(normalizeHighlight);
  }, [homeAppUpdates]);

  const communityClips = useMemo(() => {
    return homeAppUpdates
      .filter(item =>
        item.version === COMMUNITY_CLIP_VERSION &&
        item.isActive !== false
      )
      .map(normalizeCommunityClip);
  }, [homeAppUpdates]);

  const spotlights = useMemo(() => {
    return homeAppUpdates
      .filter(item =>
        item.version === SPOTLIGHT_VERSION &&
        item.isActive !== false
      )
      .map(normalizeSpotlight);
  }, [homeAppUpdates]);

  const adBanners = useMemo(() => {
    return homeAppUpdates
      .filter(item =>
        item.version === AD_BANNER_VERSION &&
        item.isActive !== false
      )
      .map(normalizeAdBanner);
  }, [homeAppUpdates]);

  const gameDayShots = useMemo(() => {
    return homeAppUpdates
      .filter(item =>
        item.version === GAMEDAY_SHOT_VERSION &&
        item.isActive !== false
      )
      .map(normalizeGameDayShot);
  }, [homeAppUpdates]);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);

  const query = search.trim().toLowerCase();

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      if (selectedLeagueId && game.leagueId !== selectedLeagueId) return false;

      if (!query) return true;

      const home = teamsById.get(game.homeTeamId);
      const away = teamsById.get(game.awayTeamId);
      const league = leaguesById.get(game.leagueId);

      const competition = tournaments.find(item =>
        item.id === game.competitionId ||
        item.id === game.tournamentId
      );

      const haystack = [
        home?.name,
        home?.shortName,
        away?.name,
        away?.shortName,
        league?.name,
        league?.shortName,
        competition?.name,
        game.homeTeamPlaceholder,
        game.awayTeamPlaceholder,
        game.venue,
        game.city,
        game.roundName,
        game.status === "cancelled" ? "abgesagt cancelled" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [games, leaguesById, query, selectedLeagueId, teamsById, tournaments]);

  const today = useMemo(() => startOfDay(new Date()), []);
const tomorrow = useMemo(() => addDays(today, 1), [today]);
const lastSevenDays = useMemo(() => subDays(today, 7), [today]);
const nextSevenDays = useMemo(() => addDays(today, 7), [today]);

  const teamRecords = useMemo(() => buildTeamRecords(games), [games]);
  const leagueRanks = useMemo(() => buildLeagueRanks(teamRecords, leaguesById), [teamRecords, leaguesById]);

  const liveGames = useMemo(() => {
    return filteredGames
      .filter((game) => getEffectiveGameStatus(game) === "live")
      .slice(0, 7);
  }, [filteredGames]);

  const gameOfTheWeek = useMemo(() => {
    const completedWeek = findLatestCompletedGameWeek(filteredGames, today);

    const candidates = completedWeek?.games?.length
      ? completedWeek.games
      : filteredGames.filter(game => {
          const date = getGameDate(game);
          if (!date) return false;
          if (!hasFinalScore(game)) return false;

          return isAfter(date, lastSevenDays) && isBefore(date, addDays(today, 1));
        });

    if (candidates.length === 0) return null;

    const scored = candidates.map(game => {
      const league = getLeague(game.leagueId, leaguesById);
      const diff = getScoreDiff(game);
      const total = getTotalPoints(game);

      let score = 0;
      let label = "";

      if (diff >= 1 && diff <= 3) {
        score += 70;
        label = "Closest Finish";
      } else if (diff >= 4 && diff <= 7) {
        score += 45;
        label = "Close Game";
      }

      if (total >= 60) {
        score += 30;
        label = label || "Shootout";
      }

      if (isSpecialGame(game)) {
        score += 25;
        label = label || "Top Matchup";
      }

      const homeRank = leagueRanks.get(`${game.leagueId || "unknown"}:${game.homeTeamId}`);
      const awayRank = leagueRanks.get(`${game.leagueId || "unknown"}:${game.awayTeamId}`);

      if (homeRank && awayRank && homeRank <= 3 && awayRank <= 3) {
        score += 25;
        label = label || "Top Matchup";
      }

      score += Math.max(0, 20 - getLeaguePriority(league));
      score += Math.min(total, 80) / 8;

      return {
        game,
        score,
        label,
      };
    });

    return scored.sort((a, b) => b.score - a.score)[0] || null;
  }, [filteredGames, lastSevenDays, leagueRanks, leaguesById, today]);

  const homeHighlights = useMemo(() => {
  const maxAgeDate = subDays(today, 7);

  return [...highlights]
    .filter(highlight => highlight.active !== false)
    .filter(highlight => {
      const linkedGame = highlight.game_id
        ? gamesById.get(highlight.game_id)
        : null;

      const gameDate = linkedGame ? getGameDate(linkedGame) : null;

      // Wenn ein Highlight einem Spiel zugeordnet ist,
      // zählt das Spiel-Datum.
      if (gameDate) {
        return !isBefore(gameDate, maxAgeDate) && !isAfter(gameDate, addDays(today, 1));
      }

      // Wenn kein Spiel zugeordnet ist, nutzen wir als Fallback das Highlight-Datum.
      const rawDate =
        highlight.date ||
        highlight.createdAtUtc ||
        highlight.created_date ||
        '';

      if (!rawDate) return true;

      const highlightDate = startOfDay(new Date(rawDate));

      if (Number.isNaN(highlightDate.getTime())) return true;

      return !isBefore(highlightDate, maxAgeDate);
    })
    .filter(highlight => highlightMatchesCurrentFilter(
      highlight,
      selectedLeagueId,
      query,
      teamsById,
      leaguesById,
      gamesById
    ))
    .sort((a, b) => {
      const gameA = a.game_id ? gamesById.get(a.game_id) : null;
      const gameB = b.game_id ? gamesById.get(b.game_id) : null;

      const dateA = (
        getGameDate(gameA) ||
        new Date(a.date || a.createdAtUtc || a.created_date || 0)
      ).getTime();

      const dateB = (
        getGameDate(gameB) ||
        new Date(b.date || b.createdAtUtc || b.created_date || 0)
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 8);
}, [gamesById, highlights, leaguesById, query, selectedLeagueId, teamsById, today]);

  const homeCommunityClips = useMemo(() => {
    return [...communityClips]
      .filter(clip => clip.active !== false)
      .filter(clip => highlightMatchesCurrentFilter(
        clip,
        selectedLeagueId,
        query,
        teamsById,
        leaguesById,
        gamesById
      ))
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.date || b.createdAtUtc || b.created_date || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 8);
  }, [communityClips, gamesById, leaguesById, query, selectedLeagueId, teamsById]);

  const activeAdBanners = useMemo(() => {
    return [...adBanners]
      .filter(banner => isActiveInDateRange(banner, today))
      .filter(banner => banner.image_url || banner.title)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;

        const dateA = new Date(a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.createdAtUtc || b.created_date || 0).getTime();

        return dateB - dateA;
      })
      .slice(0, 2);
  }, [adBanners, today]);

  const undefeatedTeams = useMemo(() => {
    const bestByLeague = new Map();

    Array.from(teamRecords.values())
      .filter(record => record.played > 0 && record.losses === 0)
      .map(record => ({
        record,
        team: getTeam(record.teamId, teamsById),
        league: getLeague(record.leagueId, leaguesById),
      }))
      .filter(item => item.team)
      .forEach(item => {
        const leagueKey = item.record.leagueId || item.team.leagueId || "unknown";
        const current = bestByLeague.get(leagueKey);

        if (!current) {
          bestByLeague.set(leagueKey, item);
          return;
        }

        if (item.record.wins > current.record.wins) {
          bestByLeague.set(leagueKey, item);
          return;
        }

        if (
          item.record.wins === current.record.wins &&
          (item.team.name || "").localeCompare(current.team.name || "") < 0
        ) {
          bestByLeague.set(leagueKey, item);
        }
      });

    return Array.from(bestByLeague.values())
      .sort((a, b) => {
        if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;

        const leaguePriorityA = getLeaguePriority(a.league);
        const leaguePriorityB = getLeaguePriority(b.league);

        if (leaguePriorityA !== leaguePriorityB) return leaguePriorityA - leaguePriorityB;

        return (a.team.name || "").localeCompare(b.team.name || "");
      })
      .slice(0, 10);
  }, [leaguesById, teamRecords, teamsById]);

  const upcomingGames = useMemo(() => {
  const now = new Date();

  return filteredGames
    .filter((game) => {
      const date = getGameDate(game);
      if (!date) return false;

      const effectiveStatus = getEffectiveGameStatus(game);
      if (effectiveStatus === "live" || effectiveStatus === "final" || effectiveStatus === "cancelled") return false;

      return (
        !isBefore(date, now) &&
        isBefore(date, addDays(nextSevenDays, 1))
      );
    })
    .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
    .slice(0, 7);
}, [filteredGames, nextSevenDays]);

  const gameDayShotGames = useMemo(() => {
  const grouped = new Map();
  const maxAgeDate = subDays(today, 7);

  gameDayShots
    .filter(shot => shot.active !== false && shot.game_id && shot.image_url)
    .forEach(shot => {
      const game = gamesById.get(shot.game_id);
      if (!game) return;
      if (getEffectiveGameStatus(game) === "cancelled") return;

      const gameDate = getGameDate(game);
      if (!gameDate) return;

      // Nur Spiele anzeigen, die maximal 7 Tage zurückliegen.
      // Ab dem 8. Tag verschwinden sie automatisch.
      if (isBefore(gameDate, maxAgeDate)) return;

      // Nur vergangene oder heutige Spiele anzeigen, keine zukünftigen.
      if (isAfter(gameDate, addDays(today, 1))) return;

      if (selectedLeagueId && game.leagueId !== selectedLeagueId) return;

      if (query) {
        const home = teamsById.get(game.homeTeamId);
        const away = teamsById.get(game.awayTeamId);
        const league = leaguesById.get(game.leagueId);

        const haystack = [
          home?.name,
          home?.shortName,
          away?.name,
          away?.shortName,
          league?.name,
          league?.shortName,
          game.homeTeamPlaceholder,
          game.awayTeamPlaceholder,
          game.roundName,
          shot.caption,
          shot.credit,
          shot.instagram,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) return;
      }

      if (!grouped.has(shot.game_id)) {
        grouped.set(shot.game_id, {
          game,
          shots: [],
        });
      }

      grouped.get(shot.game_id).shots.push(shot);
    });

  return Array.from(grouped.values())
    .map(item => ({
      ...item,
      shots: item.shots.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;

        const dateA = new Date(a.created_at || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAtUtc || b.created_date || 0).getTime();

        return dateA - dateB;
      }),
    }))
    .sort((a, b) => {
      const dateA = getGameDate(a.game)?.getTime() || 0;
      const dateB = getGameDate(b.game)?.getTime() || 0;

      return dateB - dateA;
    })
    .slice(0, 10);
}, [gameDayShots, gamesById, leaguesById, query, selectedLeagueId, teamsById, today]);

  const activeSpotlight = useMemo(() => {
    const candidates = spotlights
      .filter(spotlight => {
        if (!spotlight.active || !spotlight.team_id) return false;

        const start = spotlight.start_date ? startOfDay(parseISO(spotlight.start_date)) : null;
        const end = spotlight.end_date ? startOfDay(parseISO(spotlight.end_date)) : null;

        if (!start || !end) return false;

        return !isBefore(today, start) && !isAfter(today, addDays(end, 1));
      })
      .sort((a, b) => {
        const dateA = new Date(a.start_date || a.created_date || 0).getTime();
        const dateB = new Date(b.start_date || b.created_date || 0).getTime();

        return dateA - dateB;
      });

    return candidates[0] || null;
  }, [spotlights, today]);

  const spotlightTeam = activeSpotlight ? getTeam(activeSpotlight.team_id, teamsById) : null;
  const spotlightLeague = spotlightTeam ? getLeague(spotlightTeam.leagueId, leaguesById) : null;
  const spotlightRecord = spotlightTeam ? teamRecords.get(spotlightTeam.id) : null;

  const spotlightNextGames = useMemo(() => {
    if (!spotlightTeam) return [];

    return games
      .filter(game => {
        const date = getGameDate(game);
        if (!date) return false;
        const effectiveStatus = getEffectiveGameStatus(game);
        if (effectiveStatus === "final" || effectiveStatus === "cancelled") return false;
        if (game.homeTeamId !== spotlightTeam.id && game.awayTeamId !== spotlightTeam.id) return false;

        return isAfter(date, today);
      })
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 2);
  }, [games, spotlightTeam, today]);

  const toggleLeague = leagueId => {
    setSelectedLeagueId(current => (current === leagueId ? null : leagueId));
  };

const sortedHomeLeagues = useMemo(() => {
  const getLeagueScopePriority = (league) => {
    const scope = String(
      league.scope ||
      league.type ||
      league.category ||
      league.regionType ||
      ''
    ).toLowerCase();

    const country = String(league.country || '').toLowerCase();
    const region = String(league.region || league.state || league.federalState || '').toLowerCase();
    const name = String(league.name || league.shortName || '').toLowerCase();

    // Europa / International zuerst
    if (
      scope.includes('international') ||
      scope.includes('europe') ||
      scope.includes('europa') ||
      country.includes('international') ||
      country.includes('europe') ||
      country.includes('europa') ||
      name.includes('europe') ||
      name.includes('european') ||
      name.includes('efl') ||
      name.includes('cefl') ||
      name.includes('elf')
    ) {
      return 0;
    }

    // Länder danach, z.B. Deutschland
    if (
      country &&
      !region &&
      (
        country.includes('deutschland') ||
        country.includes('germany') ||
        country.includes('de')
      )
    ) {
      return 1;
    }

    // Bundesländer / Regionen danach
    if (region) {
      return 2;
    }

    return 3;
  };

  return [...leagues].sort((a, b) => {
    const scopeA = getLeagueScopePriority(a);
    const scopeB = getLeagueScopePriority(b);

    if (scopeA !== scopeB) return scopeA - scopeB;

    const sortA = Number(a.sortOrder ?? a.order ?? a.displayOrder ?? 999);
    const sortB = Number(b.sortOrder ?? b.order ?? b.displayOrder ?? 999);

    if (sortA !== sortB) return sortA - sortB;

    const levelA = Number(a.level ?? a.tier ?? 999);
    const levelB = Number(b.level ?? b.tier ?? 999);

    if (levelA !== levelB) return levelA - levelB;

    const regionA = String(a.region || a.state || a.federalState || '');
    const regionB = String(b.region || b.state || b.federalState || '');

    if (regionA !== regionB) {
      return regionA.localeCompare(regionB, 'de');
    }

    return String(a.name || '').localeCompare(String(b.name || ''), 'de');
  });
}, [leagues]);

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-6">
      <LeagueCarousel
  leagues={sortedHomeLeagues}
  selectedLeagueId={selectedLeagueId}
  onToggle={toggleLeague}
/>

      <SearchBox value={search} onChange={setSearch} />

      <RailSection
        icon={Zap}
        title="Live Games"
        to="/spiele"
        emptyLabel="Keine Live Games"
      >
        {liveGames.length > 0
          ? liveGames.map((game) => (
              <LiveGameCard
                key={game.id}
                game={game}
                teamsById={teamsById}
                leaguesById={leaguesById}
              />
            ))
          : null}
      </RailSection>

      {gameOfTheWeek && (
        <GameOfWeekCard
          game={gameOfTheWeek.game}
          label={gameOfTheWeek.label}
          teamsById={teamsById}
          leaguesById={leaguesById}
        />
      )}

      <RailSection
        icon={Flame}
        title="Community Clips"
        emptyLabel="Noch keine Community Clips"
      >
        {homeCommunityClips.length > 0
          ? homeCommunityClips.map((clip) => (
              <HighlightReelCard
                key={clip.id}
                highlight={clip}
                teamsById={teamsById}
                leaguesById={leaguesById}
                gamesById={gamesById}
              />
            ))
          : null}
      </RailSection>

      <RailSection
        icon={ShieldCheck}
        title="Siegesserien"
        emptyLabel="Keine aktiven Siegesserien"
        hideWhenEmpty
      >
        {undefeatedTeams.length > 0
          ? undefeatedTeams.map((item) => (
              <UndefeatedTeamCard
                key={`${item.record.leagueId || item.team.leagueId || "unknown"}-${item.team.id}`}
                item={item}
                leaguesById={leaguesById}
              />
            ))
          : null}
      </RailSection>

      <RailSection
        icon={Play}
        title="Game Highlights"
        to="/highlights"
        emptyLabel="Keine Highlights"
      >
        {homeHighlights.length > 0
          ? homeHighlights.map((highlight) => (
              <HighlightReelCard
                key={highlight.id}
                highlight={highlight}
                teamsById={teamsById}
                leaguesById={leaguesById}
                gamesById={gamesById}
                wide
              />
            ))
          : null}
      </RailSection>

      <AdBannerSlot banners={activeAdBanners} position="after_highlights" />

      <RailSection
        icon={CalendarDays}
        title="Kommende Spiele"
        to="/spiele"
        emptyLabel="Keine kommenden Spiele"
      >
        {upcomingGames.length > 0
          ? upcomingGames.map((game) => (
              <UpcomingGameCard
                key={game.id}
                game={game}
                teamsById={teamsById}
                leaguesById={leaguesById}
              />
            ))
          : null}
      </RailSection>

      <RailSection
  icon={Camera}
  title="GameDay Shots"
  emptyLabel="Noch keine GameDay Shots"
>
  {gameDayShotGames.length > 0
    ? gameDayShotGames.map((item) => (
        <GameDayShotsReelCard
          key={item.game.id}
          item={item}
          teamsById={teamsById}
          leaguesById={leaguesById}
          onOpen={setActiveShotStory}
        />
      ))
    : null}
</RailSection>

      <AdBannerSlot banners={activeAdBanners} position="after_upcoming" />
      <AdBannerSlot banners={activeAdBanners} position="before_spotlight" />

      {activeSpotlight && spotlightTeam && (
        <TeamSpotlightCard
          spotlight={activeSpotlight}
          team={spotlightTeam}
          league={spotlightLeague}
          record={spotlightRecord}
          nextGames={spotlightNextGames}
          teamsById={teamsById}
        />
      )}

      {activeShotStory && (
        <GameDayShotStoryModal
          item={activeShotStory}
          teamsById={teamsById}
          leaguesById={leaguesById}
          onClose={() => setActiveShotStory(null)}
        />
      )}
    </div>
  );
}