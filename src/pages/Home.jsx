import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isBefore, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, Play, Radio } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useGlobalData } from "@/lib/GlobalDataContext";
import { getImageUrl } from "@/lib/imageUtils";

const HIGHLIGHT_VERSION = "game_highlight";
const AD_BANNER_VERSION = "ad_banner";
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
  if (game.status === "live") return "live";

  const kickoff = getGameDate(game);
  if (!kickoff) return game.status || "scheduled";

  if ((game.status || "scheduled") === "scheduled" && Date.now() >= kickoff.getTime()) {
    return "live";
  }

  return game.status || "scheduled";
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

function withAlpha(hex, alpha = "20") {
  const value = String(hex || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return `${value}${alpha}`;
  return "#eef2ff";
}

function TeamLogo({ team, fallback }) {
  const color = getTeamColor(team, "#005bff");

  if (!team?.logo) return null;

  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 p-1"
      style={{
        background: `linear-gradient(135deg, ${withAlpha(color, "52")}, #ffffff 58%)`,
        boxShadow: `inset 0 -4px 0 ${color}, 0 1px 2px rgba(15,23,42,0.12)`,
      }}
    >
      {team?.logo ? (
        <img
          src={getImageUrl(team.logo)}
          alt={team.name || ""}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

function StatusPill({ game }) {
  const status = getEffectiveGameStatus(game);
  const label = {
    live: "LIVE",
    final: "FINAL",
    cancelled: "ABGESAGT",
    scheduled: "GEPLANT",
  }[status] || "GEPLANT";

  const className = status === "live"
    ? "bg-red-600 text-white"
    : status === "final"
    ? "bg-slate-950 text-white"
    : "bg-blue-700 text-white";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${className}`}>
      {label}
    </span>
  );
}

function SmallGameCard({ game, teamsById, leaguesById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = status === "live" || status === "final";
  const homeColor = getTeamColor(home, league?.primaryColor || "#005bff");
  const awayColor = getTeamColor(away, "#b51222");

  return (
    <Link
      to={`/game/${game.id}`}
      className="block overflow-hidden rounded-[22px] bg-white text-black"
    >
      <div className="grid grid-cols-[5px_1fr_5px]">
        <div style={{ background: homeColor }} />
        <div className="p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-[9px] font-black uppercase text-black/45">
              {league?.shortName || league?.name || "Game"}
            </p>
            <StatusPill game={game} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <TeamLogo team={home} fallback={homeName} />
              <p className="min-w-0 flex-1 truncate text-[11px] font-black leading-tight">{homeName}</p>
              {showScore && <span className="text-lg font-black tabular-nums">{game.scoreHome ?? 0}</span>}
            </div>

            <div className="flex items-center gap-2.5">
              <TeamLogo team={away} fallback={awayName} />
              <p className="min-w-0 flex-1 truncate text-[11px] font-black leading-tight">{awayName}</p>
              {showScore ? (
                <span className="text-lg font-black tabular-nums">{game.scoreAway ?? 0}</span>
              ) : (
                <span className="text-sm font-black text-blue-700">
                  {kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ background: awayColor }} />
      </div>
    </Link>
  );
}

function WideGameCard({ game, teamsById, leaguesById }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = status === "live" || status === "final";
  const homeColor = getTeamColor(home, league?.primaryColor || "#005bff");
  const awayColor = getTeamColor(away, "#b51222");

  return (
    <Link to={`/game/${game.id}`} className="block overflow-hidden rounded-[22px] bg-white text-black">
      <div className="grid grid-cols-[6px_1fr_6px]">
        <div style={{ background: homeColor }} />
        <div className="p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase text-black/45">
                {league?.shortName || league?.name || "Game"}
              </p>
              <p className="truncate text-[11px] font-bold text-black/40">
                {kickoff ? format(kickoff, "EEE dd.MM.", { locale: de }) : "Termin offen"}
              </p>
            </div>
            <StatusPill game={game} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0">
              <TeamLogo team={home} fallback={homeName} />
              <p className="mt-2 whitespace-normal break-words text-sm font-black leading-tight">
                {homeName}
              </p>
            </div>

            <div className="min-w-[70px] rounded-2xl bg-slate-950 px-3 py-2 text-center text-white">
              {showScore ? (
                <p className="text-xl font-black tabular-nums">
                  {game.scoreHome ?? 0}:{game.scoreAway ?? 0}
                </p>
              ) : (
                <>
                  <p className="text-lg font-black">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}</p>
                  <p className="text-[8px] font-black uppercase text-white/55">Kickoff</p>
                </>
              )}
            </div>

            <div className="min-w-0 text-right">
              <div className="flex justify-end">
                <TeamLogo team={away} fallback={awayName} />
              </div>
              <p className="mt-2 whitespace-normal break-words text-sm font-black leading-tight">
                {awayName}
              </p>
            </div>
          </div>
        </div>
        <div style={{ background: awayColor }} />
      </div>
    </Link>
  );
}

function SectionTitle({ title, to }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="yardline-heading text-[22px] sm:text-2xl">{title}</h2>
        <div className="yardline-title-bars" />
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

function EmptyCard({ label }) {
  return (
    <div className="rounded-[22px] bg-white px-4 py-6 text-center">
      <p className="text-xs font-bold text-black/45">{label}</p>
    </div>
  );
}

function groupGamesByLeague(games, leaguesById) {
  const map = new Map();

  games.forEach((game) => {
    const leagueKey = game.leagueId || "unknown";
    const league = leaguesById.get(game.leagueId);

    if (!map.has(leagueKey)) {
      map.set(leagueKey, {
        key: leagueKey,
        league,
        title: league?.shortName || league?.name || "Ohne Liga",
        games: [],
      });
    }

    map.get(leagueKey).games.push(game);
  });

  return Array.from(map.values()).sort((a, b) => {
    const sortA = Number(a.league?.sortOrder ?? a.league?.level ?? 999);
    const sortB = Number(b.league?.sortOrder ?? b.league?.level ?? 999);
    if (sortA !== sortB) return sortA - sortB;
    return a.title.localeCompare(b.title, "de");
  });
}

function LeagueGameGrid({ groups, teamsById, leaguesById, emptyLabel }) {
  if (groups.length === 0) return <EmptyCard label={emptyLabel} />;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-2 flex items-center gap-2">
            {group.league?.logo && (
              <img
                src={getImageUrl(group.league.logo)}
                alt=""
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            )}
            <h3 className="text-xs font-black uppercase tracking-wide text-black/55">
              {group.title}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {group.games.map((game) => (
              <SmallGameCard
                key={game.id}
                game={game}
                teamsById={teamsById}
                leaguesById={leaguesById}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LeagueGameList({ groups, teamsById, leaguesById, emptyLabel }) {
  if (groups.length === 0) return <EmptyCard label={emptyLabel} />;

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-2 flex items-center gap-2">
            {group.league?.logo && (
              <img
                src={getImageUrl(group.league.logo)}
                alt=""
                className="h-5 w-5 object-contain"
                loading="lazy"
              />
            )}
            <h3 className="text-xs font-black uppercase tracking-wide text-black/55">
              {group.title}
            </h3>
          </div>

          <div className="space-y-3">
            {group.games.map((game) => (
              <WideGameCard
                key={game.id}
                game={game}
                teamsById={teamsById}
                leaguesById={leaguesById}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeHighlight(item) {
  const meta = parseJsonMessage(item.message);

  return {
    id: item.id,
    title: item.title || meta.title || "Game Highlight",
    imageUrl: meta.thumbnail_url || item.imageUrl || "",
    url: meta.external_video_url || meta.preview_video_url || "",
    gameId: meta.game_id || "",
  };
}

function HighlightCard({ item }) {
  const content = (
    <div className="overflow-hidden rounded-[22px] bg-white text-black">
      <div className="aspect-video bg-slate-200">
        {item.imageUrl ? (
          <img src={getImageUrl(item.imageUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-7 w-7 text-red-700" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs font-black leading-tight">{item.title}</p>
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

function normalizeAdBanner(item) {
  const meta = parseJsonMessage(item.message);

  return {
    id: item.id,
    title: item.title || meta.title || "",
    imageUrl: meta.image_url || item.imageUrl || "",
    linkUrl: meta.link_url || "",
    position: meta.position || "after_highlights",
    active: item.isActive !== false && meta.active !== false,
  };
}

function AdBanner({ banner }) {
  if (!banner?.active || (!banner.imageUrl && !banner.title)) return null;

  const content = (
    <div className="overflow-hidden rounded-[22px] bg-white text-black">
      {banner.imageUrl ? (
        <img src={getImageUrl(banner.imageUrl)} alt={banner.title || "Werbung"} className="aspect-[16/7] w-full object-cover" loading="lazy" />
      ) : (
        <div className="p-4 text-sm font-black">{banner.title}</div>
      )}
    </div>
  );

  if (banner.linkUrl?.startsWith("http")) {
    return <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">{content}</a>;
  }

  if (banner.linkUrl) {
    return <Link to={banner.linkUrl}>{content}</Link>;
  }

  return content;
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
    spotifyUrl: meta.spotify_url || meta.url || "",
    podcastTitle: meta.podcast_title || "Football Germany Podcast",
    episodeTitle: meta.episode_title || item.title || "",
    thumbnailUrl: meta.thumbnail_url || item.imageUrl || "",
    partnerName: meta.partner_name || "Football Germany",
    updatedAt: meta.updated_at || item.updatedAtUtc || item.updated_date || item.createdAtUtc || item.created_date || "",
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

  return {
    id: item.id,
    gameId: meta.game_id || "",
    imageUrl: meta.image_url || item.imageUrl || "",
    caption: meta.caption || item.title || "",
    active: item.isActive !== false && meta.active !== false,
  };
}

function ShotCard({ shot }) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white text-black">
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
  const color = getTeamColor(item.team, "#005bff");

  return (
    <Link to={`/team/${item.team.id}`} className="yardline-stripes block overflow-hidden rounded-[22px] bg-white text-black">
      <div className="relative flex items-center gap-3 p-3">
        <TeamLogo team={item.team} fallback={item.team.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{item.team.name}</p>
          <p className="text-[10px] font-black uppercase tracking-wide text-black/45">
            Unbeaten Run
          </p>
        </div>
        <div
          className="rounded-2xl px-3 py-2 text-center text-white"
          style={{ background: color }}
        >
          <p className="text-2xl font-black leading-none">W{item.record.wins}</p>
          <p className="text-[8px] font-black uppercase text-white/70">Serie</p>
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
          <p className="yardline-heading">
            Game of the Week
            {cleanLabel && (
              <>
                {" "}
                <span
                  className="yardline-script inline-block whitespace-nowrap text-lg font-normal normal-case text-red-700 align-baseline sm:text-2xl"
                >
                  presented by {cleanLabel}
                </span>
              </>
            )}
          </p>

          <div className="yardline-title-bars" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { games, teams, leagues, gamesById } = useGlobalData();

  const { data: appUpdates = [] } = useQuery({
    queryKey: ["home-overview-updates"],
    queryFn: () => base44.entities.AppUpdate.list("-created_date", 100),
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
  const today = useMemo(() => startOfDay(new Date()), []);
  const nextSevenDays = useMemo(() => addDays(today, 7), [today]);
  const lastTwentyOneDays = useMemo(() => subDays(today, 21), [today]);

  const liveGroups = useMemo(() => {
    const liveGames = games
      .filter((game) => getEffectiveGameStatus(game) === "live")
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));

    return groupGamesByLeague(liveGames, leaguesById);
  }, [games, leaguesById]);

  const upcomingGroups = useMemo(() => {
    const upcomingGames = games
      .filter((game) => {
        const date = getGameDate(game);
        if (!date) return false;
        const status = getEffectiveGameStatus(game);
        return status !== "live" && status !== "final" && status !== "cancelled" && !isBefore(date, new Date()) && isBefore(date, addDays(nextSevenDays, 1));
      })
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 12);

    return groupGamesByLeague(upcomingGames, leaguesById);
  }, [games, leaguesById, nextSevenDays]);

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

  const adBanners = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === AD_BANNER_VERSION && item.isActive !== false)
      .map(normalizeAdBanner)
      .filter((item) => item.active);
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
      .filter((shot) => {
        const game = gamesById.get(shot.gameId);
        const date = getGameDate(game);
        return shot.active && shot.imageUrl && date && !isBefore(date, lastTwentyOneDays);
      })
      .slice(0, 4);
  }, [appUpdates, gamesById, lastTwentyOneDays]);

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
      <div className="mb-5">
        <h1 className="yardline-page-heading">Home</h1>
        <div className="yardline-title-bars" />
      </div>

      <div className="space-y-7">
        <section>
          <SectionTitle title="Live Now" to="/match-center" />
          <LeagueGameGrid
            groups={liveGroups}
            teamsById={teamsById}
            leaguesById={leaguesById}
            emptyLabel="Keine Live Games"
          />
        </section>

        {adBanners.filter((banner) => banner.position === "top" || banner.position === "after_live").map((banner) => (
          <AdBanner key={banner.id} banner={banner} />
        ))}

        <section>
          <SectionTitle title="Game Highlights" to="/highlights" />
          {highlights.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {highlights.map((item) => <HighlightCard key={item.id} item={item} />)}
            </div>
          ) : (
            <EmptyCard label="Keine Highlights" />
          )}
        </section>

        {gameOfTheWeek && (
          <section>
            <GameOfWeekTitle label={gameOfTheWeekLabel} />
            <SmallGameCard game={gameOfTheWeek} teamsById={teamsById} leaguesById={leaguesById} />
          </section>
        )}

        {news.length > 0 && (
          <section>
            <SectionTitle title="News" to="/feed" />
            <div className="grid grid-cols-2 gap-3">
              {news.map((post) => <NewsCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {podcast && (
          <section>
            <SectionTitle title="Podcast" />
            <PodcastCard podcast={podcast} />
          </section>
        )}

        {adBanners.filter((banner) => !["top", "after_live", "after_upcoming"].includes(banner.position)).map((banner) => (
          <AdBanner key={banner.id} banner={banner} />
        ))}

        {undefeatedTeams.length > 0 && (
          <section>
            <SectionTitle title="Siegesserien" />
            <div className="grid grid-cols-2 gap-3">
              {undefeatedTeams.map((item) => <StreakCard key={item.team.id} item={item} />)}
            </div>
          </section>
        )}

        <section>
          <SectionTitle title="GameDay Shots" />
          {shots.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {shots.map((shot) => <ShotCard key={shot.id} shot={shot} />)}
            </div>
          ) : (
            <EmptyCard label="Noch keine GameDay Shots" />
          )}
        </section>

        <section>
          <SectionTitle title="Kommende Spiele" to="/match-center" />
          <LeagueGameList
            groups={upcomingGroups}
            teamsById={teamsById}
            leaguesById={leaguesById}
            emptyLabel="Keine kommenden Spiele"
          />
        </section>

        {adBanners.filter((banner) => banner.position === "after_upcoming").map((banner) => (
          <AdBanner key={banner.id} banner={banner} />
        ))}
      </div>
    </div>
  );
}
