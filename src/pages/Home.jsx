import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isBefore, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, Play, Radio } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";

const HIGHLIGHT_VERSION = "game_highlight";
const GAMEDAY_SHOT_VERSION = "gameday_photo";
const PODCAST_VERSION = "podcast_feature";

function parseJsonMessage(message) {
  if (!message) return {};

  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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
  return "scheduled";
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

function getTeamName(team, fallback) {
  return team?.shortName || team?.name || fallback || "Offen";
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
    final: "FINAL",
    cancelled: "ABGESAGT",
  }[status] || "";

  const className = status === "final"
    ? "bg-slate-950 text-white"
    : "bg-red-700 text-white";

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
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = status === "final";
  const homeColor = getTeamColor(home, league?.primaryColor || "#013369");
  const awayColor = getTeamColor(away, "#c20f1a");

  return (
    <Link
      to={`/game/${game.id}`}
      className={`block overflow-hidden rounded-[28px] border border-white/10 bg-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.32)] ${compact ? "min-w-[82vw]" : ""}`}
    >
      <div className="relative grid min-h-[150px] grid-cols-2 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0_1px,transparent_1px_18px)] opacity-35" />
        <div
          className="relative flex flex-col justify-between p-3"
          style={{ background: homeColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-black/18" />
          <div className="relative z-10 flex items-start justify-start gap-2">
            <TeamLogo team={home} className="h-20 w-20" />
          </div>
          <div className="relative z-10 pr-12 text-left">
            <p className="line-clamp-2 text-base font-black leading-tight">{homeName}</p>
          </div>
        </div>

        <div
          className="relative flex flex-col justify-between p-3 text-right"
          style={{ background: awayColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-white/18 via-transparent to-black/18" />
          <div className="relative z-10 flex items-start justify-end gap-2">
            <TeamLogo team={away} className="h-20 w-20" />
          </div>
          <div className="relative z-10 pl-12 text-right">
            <p className="line-clamp-2 text-base font-black leading-tight">{awayName}</p>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 z-20 flex min-w-[104px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[18px] border border-white/24 bg-black px-4 py-3 text-white shadow-[0_12px_30px_rgba(0,0,0,0.62),0_0_0_1px_rgba(194,15,26,0.22)]">
          <StatusPill game={game} />
          {showScore ? (
            <div className="mt-1 flex items-center gap-2 text-3xl font-black tabular-nums leading-none">
              <span>{game.scoreHome ?? 0}</span>
              <span className="text-white/35">:</span>
              <span>{game.scoreAway ?? 0}</span>
            </div>
          ) : (
            <>
              <span className="text-2xl font-black leading-none text-[#ff2338]">
                {kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}
              </span>
              <span className="mt-1 text-[9px] font-black uppercase text-white/82">
                {kickoff ? format(kickoff, "dd.MM.", { locale: de }) : "Offen"}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function SmallGameCard({ game, teamsById, leaguesById }) {
  return <ColorGameCard game={game} teamsById={teamsById} leaguesById={leaguesById} compact />;
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
    <div className="-mx-4 overflow-x-auto px-4 pb-2 hide-scrollbar">
      <div className="flex gap-4">
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

  return {
    id: item.id,
    title: item.title || meta.title || "Game Highlight",
    imageUrl: meta.thumbnail_url || meta.thumbnailUrl || item.imageUrl || "",
    url: meta.external_video_url || meta.externalVideoUrl || meta.preview_video_url || meta.previewVideoUrl || meta.url || "",
    gameId: meta.game_id || meta.gameId || "",
  };
}

function HighlightCard({ item }) {
  const content = (
    <div className="overflow-hidden rounded-[28px] bg-white text-black shadow-[0_12px_30px_rgba(15,23,42,0.10)]">
      <div className="aspect-[16/9] bg-slate-200">
        {item.imageUrl ? (
          <img src={getImageUrl(item.imageUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-7 w-7 text-red-700" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-lg font-black leading-tight">{item.title}</p>
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block min-w-[82vw] max-w-[82vw]">
        {content}
      </a>
    );
  }

  return <div className="min-w-[82vw] max-w-[82vw]">{content}</div>;
}

function NewsCard({ post }) {
  const imageUrl = post.imageUrl || post.coverImageUrl || post.thumbnailUrl || "";

  return (
    <Link to={`/post/${post.id}`} className="block overflow-hidden rounded-[22px] bg-white text-black">
      {imageUrl && (
        <img src={getImageUrl(imageUrl)} alt="" className="aspect-[16/8] w-full object-cover" loading="lazy" />
      )}
      <div className="p-3">
        <p className="text-[10px] font-black uppercase text-red-700">News</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight">{post.title || "News"}</h3>
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
    <a href={podcast.spotifyUrl} target="_blank" rel="noopener noreferrer" className="grid grid-cols-[82px_1fr] gap-3 rounded-[22px] bg-white p-3 text-black">
      <div className="h-[82px] w-[82px] overflow-hidden rounded-2xl bg-slate-200">
        {podcast.thumbnailUrl ? (
          <img src={getImageUrl(podcast.thumbnailUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Radio className="h-7 w-7 text-red-700" />
          </div>
        )}
      </div>
      <div className="min-w-0 self-center">
        <p className="text-[10px] font-black uppercase text-red-700">{podcast.partnerName}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-black leading-tight">
          {podcast.episodeTitle || podcast.podcastTitle}
        </h3>
        <p className="mt-2 text-xs font-bold text-black/50">Spotify öffnen</p>
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
        <p className="line-clamp-2 text-xs font-black leading-tight">{shot.caption || "GameDay Shot"}</p>
      </div>
    </div>
  );
}

function buildTeamRecords(games) {
  const records = new Map();

  const ensure = (teamId) => {
    if (!teamId) return null;
    if (!records.has(teamId)) records.set(teamId, { teamId, wins: 0, losses: 0, played: 0 });
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
    }
  });

  return records;
}

function StreakCard({ item }) {
  const color = getTeamColor(item.team, "#013369");

  return (
    <Link
      to={`/team/${item.team.id}`}
      className="block min-w-[74vw] max-w-[74vw] overflow-hidden rounded-[28px] text-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
      style={{ background: color }}
    >
      <div className="relative flex min-h-[132px] items-center gap-4 overflow-hidden p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20" />
        <TeamLogo team={item.team} className="relative z-10 h-20 w-20" />
        <div className="min-w-0 flex-1">
          <p className="relative z-10 line-clamp-2 text-xl font-black leading-tight">{item.team.name}</p>
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

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leaguesById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const sevenDaysAgo = useMemo(() => subDays(new Date(), 7), []);

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

  const highlights = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === HIGHLIGHT_VERSION && item.isActive !== false)
      .map(normalizeHighlight)
      .slice(0, 4);
  }, [appUpdates]);

  const podcast = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === PODCAST_VERSION && item.isActive !== false)
      .map(normalizePodcast)
      .filter((item) => item.active && item.spotifyUrl)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || null;
  }, [appUpdates]);

  const news = useMemo(() => {
    return posts
      .filter((post) => post.type === "news" && post.isActive !== false)
      .sort((a, b) => {
        const dateA = new Date(a.publishedAtUtc || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.publishedAtUtc || b.createdAtUtc || b.created_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [posts]);

  const shots = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === GAMEDAY_SHOT_VERSION && item.isActive !== false)
      .map(normalizeShot)
      .filter((shot) => shot.active && shot.imageUrl)
      .filter((shot) => {
        const createdAt = new Date(shot.createdAt || 0);

        return Number.isNaN(createdAt.getTime()) || !isBefore(createdAt, sevenDaysAgo);
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      })
      .slice(0, 4);
  }, [appUpdates, sevenDaysAgo]);

  useEffect(() => {
    const staleShots = appUpdates
      .filter((item) => item.version === GAMEDAY_SHOT_VERSION)
      .map(normalizeShot)
      .filter((shot) => {
        const createdAt = new Date(shot.createdAt || 0);
        return shot.id && !Number.isNaN(createdAt.getTime()) && isBefore(createdAt, sevenDaysAgo);
      });

    if (staleShots.length === 0) return;

    Promise.allSettled(staleShots.map((shot) => base44.entities.AppUpdate.delete(shot.id)))
      .then(() => queryClient.invalidateQueries({ queryKey: ["home-overview-updates"] }));
  }, [appUpdates, queryClient, sevenDaysAgo]);

  const undefeatedTeams = useMemo(() => {
    const records = buildTeamRecords(games);

    return Array.from(records.values())
      .filter((record) => record.played > 0 && record.losses === 0)
      .map((record) => ({ record, team: teamsById.get(record.teamId) }))
      .filter((item) => item.team)
      .sort((a, b) => b.record.wins - a.record.wins)
      .slice(0, 4);
  }, [games, teamsById]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="space-y-7">
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

        {gameOfTheWeek && (
          <section>
            <GameOfWeekTitle label={gameOfTheWeekLabel} />
            <SmallGameCard game={gameOfTheWeek} teamsById={teamsById} leaguesById={leaguesById} />
          </section>
        )}

        <section>
          <SectionTitle title="Game Highlights" to="/highlights" />
          {highlights.length > 0 ? (
            <HorizontalRail>
              {highlights.map((item) => <HighlightCard key={item.id} item={item} />)}
            </HorizontalRail>
          ) : (
            <EmptyCard label="Keine Highlights" />
          )}
        </section>

        {podcast && (
          <section>
            <SectionTitle title="Podcast" />
            <PodcastCard podcast={podcast} />
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

        {undefeatedTeams.length > 0 && (
          <section>
            <SectionTitle title="Siegesserien" />
            <HorizontalRail>
              {undefeatedTeams.map((item) => <StreakCard key={item.team.id} item={item} />)}
            </HorizontalRail>
          </section>
        )}
      </div>
    </div>
  );
}
