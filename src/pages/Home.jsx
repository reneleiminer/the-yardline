import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isBefore, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Newspaper,
  Play,
  Radio,
  ShieldCheck,
  Star,
  Trophy,
  Zap,
} from "lucide-react";

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

function getTeamFullName(team, fallback) {
  return team?.name || team?.shortName || fallback || "Offen";
}

function getTeamColor(team, fallback) {
  return team?.primaryColor || team?.colorPrimary || team?.teamColor || fallback;
}

function TeamMark({ team, fallback, color }) {
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white p-2"
      style={{ boxShadow: `inset 0 -4px 0 ${color || "#005bff"}` }}
    >
      {team?.logo ? (
        <img
          src={getImageUrl(team.logo)}
          alt={team.name || ""}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-black text-black">
          {team?.shortName?.[0] || team?.name?.[0] || fallback?.[0] || "?"}
        </span>
      )}
    </div>
  );
}

function StatusPill({ game }) {
  const status = getEffectiveGameStatus(game);

  const className = {
    live: "bg-red-600 text-white",
    final: "bg-black text-white",
    cancelled: "bg-zinc-500 text-white",
    scheduled: "bg-blue-700 text-white",
  }[status] || "bg-blue-700 text-white";

  const label = {
    live: "LIVE",
    final: "FINAL",
    cancelled: "ABGESAGT",
    scheduled: "GEPLANT",
  }[status] || "GEPLANT";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${className}`}>
      {label}
    </span>
  );
}

function ScoreCard({ game, teamsById, leaguesById, featured = false }) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const league = leaguesById.get(game.leagueId);
  const homeName = getTeamName(home, game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamPlaceholder);
  const homeColor = getTeamColor(home, league?.primaryColor || "#005bff");
  const awayColor = getTeamColor(away, "#e11d48");
  const kickoff = getGameDate(game);
  const status = getEffectiveGameStatus(game);
  const showScore = status === "live" || status === "final";

  return (
    <Link
      to={`/game/${game.id}`}
      className={`block overflow-hidden rounded-[26px] border border-black/10 bg-white text-black active:scale-[0.99] transition-transform ${
        featured ? "shadow-none" : ""
      }`}
    >
      <div className="grid grid-cols-[7px_1fr_7px]">
        <div style={{ background: homeColor }} />

        <div className="p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-wide text-zinc-500">
                {league?.shortName || league?.name || "Match"}
              </p>
              <p className="truncate text-[11px] font-bold text-zinc-500">
                {kickoff ? format(kickoff, "EEE dd.MM. HH:mm", { locale: de }) : "Termin offen"}
              </p>
            </div>

            <StatusPill game={game} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0">
              <TeamMark team={home} fallback={homeName} color={homeColor} />
              <p className="mt-2 text-sm font-black leading-tight whitespace-normal break-words">
                {getTeamFullName(home, game.homeTeamPlaceholder)}
              </p>
            </div>

            <div className="flex min-w-[82px] flex-col items-center justify-center rounded-2xl bg-black px-3 py-2 text-white">
              {showScore ? (
                <div className="flex items-center gap-2 text-2xl font-black tabular-nums">
                  <span>{game.scoreHome ?? 0}</span>
                  <span className="text-white/40">:</span>
                  <span>{game.scoreAway ?? 0}</span>
                </div>
              ) : (
                <>
                  <span className="text-xl font-black">{kickoff ? format(kickoff, "HH:mm", { locale: de }) : "VS"}</span>
                  <span className="text-[9px] font-black uppercase text-white/50">
                    {kickoff ? "Kickoff" : "Offen"}
                  </span>
                </>
              )}
            </div>

            <div className="min-w-0 text-right">
              <div className="flex justify-end">
                <TeamMark team={away} fallback={awayName} color={awayColor} />
              </div>
              <p className="mt-2 text-sm font-black leading-tight whitespace-normal break-words">
                {getTeamFullName(away, game.awayTeamPlaceholder)}
              </p>
            </div>
          </div>
        </div>

        <div style={{ background: awayColor }} />
      </div>
    </Link>
  );
}

function SectionTitle({ icon: Icon, title, to }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0 text-blue-500" />
        <h2 className="truncate text-base font-black text-white">{title}</h2>
      </div>

      {to && (
        <Link to={to} className="flex flex-shrink-0 items-center gap-1 text-xs font-black text-blue-400">
          Alle
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyStrip({ label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#050505] px-4 py-6 text-center">
      <p className="text-xs font-bold text-white/45">{label}</p>
    </div>
  );
}

function Hero({ liveCount, upcomingCount, leaguesCount }) {
  return (
    <section className="overflow-hidden rounded-[30px] bg-blue-700 text-white">
      <div className="p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
          The Yardline
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-normal">
          Football Center
        </h1>
        <p className="mt-2 max-w-sm text-sm font-semibold text-white/72">
          Live Games, Highlights, News und kommende Spiele in einer klaren Uebersicht.
        </p>
      </div>

      <div className="grid grid-cols-3 border-t border-white/15 bg-black text-white">
        <div className="p-4">
          <p className="text-2xl font-black">{liveCount}</p>
          <p className="text-[10px] font-black uppercase text-white/50">Live</p>
        </div>
        <div className="border-x border-white/10 p-4">
          <p className="text-2xl font-black">{upcomingCount}</p>
          <p className="text-[10px] font-black uppercase text-white/50">Kommend</p>
        </div>
        <div className="p-4">
          <p className="text-2xl font-black">{leaguesCount}</p>
          <p className="text-[10px] font-black uppercase text-white/50">Ligen</p>
        </div>
      </div>
    </section>
  );
}

function HighlightCard({ item }) {
  const meta = parseJsonMessage(item.message);
  const imageUrl = meta.thumbnail_url || item.imageUrl || "";
  const title = item.title || meta.title || "Game Highlight";

  return (
    <a
      href={meta.external_video_url || meta.preview_video_url || "#"}
      target={meta.external_video_url || meta.preview_video_url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="block w-[235px] flex-shrink-0 overflow-hidden rounded-[24px] bg-white text-black"
    >
      <div className="aspect-video bg-zinc-200">
        {imageUrl ? (
          <img src={getImageUrl(imageUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Play className="h-8 w-8 text-blue-700" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-black leading-tight">{title}</p>
        <p className="mt-1 text-[10px] font-black uppercase text-blue-700">
          Game Highlight
        </p>
      </div>
    </a>
  );
}

function NewsCard({ post }) {
  const imageUrl = post.imageUrl || post.coverImageUrl || post.thumbnailUrl || "";

  return (
    <Link
      to={`/post/${post.id}`}
      className="block overflow-hidden rounded-[24px] bg-white text-black"
    >
      {imageUrl && (
        <div className="aspect-[16/8] bg-zinc-200">
          <img src={getImageUrl(imageUrl)} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-red-600">News</p>
        <h3 className="mt-1 text-base font-black leading-tight">{post.title || "News"}</h3>
        {(post.teaser || post.text) && (
          <p className="mt-2 line-clamp-2 text-xs font-semibold text-zinc-600">
            {post.teaser || post.text}
          </p>
        )}
      </div>
    </Link>
  );
}

function PodcastCard({ podcast }) {
  if (!podcast?.spotify_url) return null;

  return (
    <section>
      <SectionTitle icon={Radio} title="Podcast" />
      <a
        href={podcast.spotify_url}
        target="_blank"
        rel="noopener noreferrer"
        className="grid grid-cols-[92px_1fr] gap-4 rounded-[26px] bg-white p-3 text-black"
      >
        <div className="h-[92px] w-[92px] overflow-hidden rounded-2xl bg-zinc-200">
          {podcast.thumbnail_url ? (
            <img src={getImageUrl(podcast.thumbnail_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Radio className="h-8 w-8 text-blue-700" />
            </div>
          )}
        </div>
        <div className="min-w-0 self-center">
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
            {podcast.partner_name || "Football Germany"}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-black leading-tight">
            {podcast.episode_title || podcast.podcast_title || "Neue Folge"}
          </h3>
          <p className="mt-2 text-xs font-bold text-zinc-500">
            Auf Spotify ansehen
          </p>
        </div>
      </a>
    </section>
  );
}

function ShotCard({ shot, game, teamsById }) {
  const home = teamsById.get(game?.homeTeamId);
  const away = teamsById.get(game?.awayTeamId);
  const title = [getTeamName(home, game?.homeTeamPlaceholder), getTeamName(away, game?.awayTeamPlaceholder)]
    .filter(Boolean)
    .join(" vs ");

  return (
    <div className="w-[150px] flex-shrink-0 overflow-hidden rounded-[24px] bg-white text-black">
      <div className="aspect-[3/4] bg-zinc-200">
        <img src={getImageUrl(shot.image_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs font-black leading-tight">{title || shot.caption || "GameDay Shot"}</p>
      </div>
    </div>
  );
}

function normalizePodcast(item) {
  const meta = parseJsonMessage(item.message);

  return {
    spotify_url: meta.spotify_url || meta.url || "",
    podcast_title: meta.podcast_title || "Football Germany Podcast",
    episode_title: meta.episode_title || item.title || "",
    thumbnail_url: meta.thumbnail_url || item.imageUrl || "",
    partner_name: meta.partner_name || "Football Germany",
    updated_at: meta.updated_at || item.updatedAtUtc || item.updated_date || item.createdAtUtc || item.created_date || "",
    active: item.isActive !== false && meta.active !== false,
  };
}

function normalizeShot(item) {
  const meta = parseJsonMessage(item.message);

  return {
    id: item.id,
    game_id: meta.game_id || "",
    image_url: meta.image_url || item.imageUrl || "",
    caption: meta.caption || item.title || "",
    active: item.isActive !== false && meta.active !== false,
    created_at: meta.created_at || item.createdAtUtc || item.created_date || "",
  };
}

function buildTeamRecords(games) {
  const records = new Map();

  const ensure = (teamId, leagueId) => {
    if (!teamId) return null;
    if (!records.has(teamId)) {
      records.set(teamId, { teamId, leagueId, wins: 0, losses: 0, played: 0 });
    }
    return records.get(teamId);
  };

  games.filter(hasFinalScore).forEach((game) => {
    const home = ensure(game.homeTeamId, game.leagueId);
    const away = ensure(game.awayTeamId, game.leagueId);
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
    <Link
      to={`/team/${item.team.id}`}
      className="flex min-w-[190px] flex-shrink-0 items-center gap-3 rounded-[24px] bg-white p-3 text-black"
    >
      <TeamMark team={item.team} fallback={item.team.name} color={color} />
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{item.team.name}</p>
        <p className="text-xl font-black text-blue-700">W{item.record.wins}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const { games, teams, leagues, gamesById } = useGlobalData();

  const { data: appUpdates = [] } = useQuery({
    queryKey: ["home-overview-updates"],
    queryFn: () => base44.entities.AppUpdate.list("-created_date", 80),
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
  const lastSevenDays = useMemo(() => subDays(today, 7), [today]);

  const liveGames = useMemo(() => {
    return games
      .filter((game) => getEffectiveGameStatus(game) === "live")
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 5);
  }, [games]);

  const upcomingGames = useMemo(() => {
    return games
      .filter((game) => {
        const date = getGameDate(game);
        if (!date) return false;
        const status = getEffectiveGameStatus(game);
        return status !== "live" && status !== "final" && status !== "cancelled" && !isBefore(date, new Date()) && isBefore(date, addDays(nextSevenDays, 1));
      })
      .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0))
      .slice(0, 6);
  }, [games, nextSevenDays]);

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

  const highlights = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === HIGHLIGHT_VERSION && item.isActive !== false)
      .filter((item) => {
        const meta = parseJsonMessage(item.message);
        const linkedGame = meta.game_id ? gamesById.get(meta.game_id) : null;
        const gameDate = linkedGame ? getGameDate(linkedGame) : null;
        if (gameDate) return !isBefore(gameDate, lastSevenDays);
        return true;
      })
      .slice(0, 8);
  }, [appUpdates, gamesById, lastSevenDays]);

  const podcast = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === PODCAST_VERSION && item.isActive !== false)
      .map(normalizePodcast)
      .filter((item) => item.active && item.spotify_url)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0] || null;
  }, [appUpdates]);

  const shots = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === GAMEDAY_SHOT_VERSION && item.isActive !== false)
      .map(normalizeShot)
      .filter((shot) => shot.active && shot.image_url && shot.game_id)
      .filter((shot) => {
        const game = gamesById.get(shot.game_id);
        const date = getGameDate(game);
        return date && !isBefore(date, lastSevenDays);
      })
      .slice(0, 8);
  }, [appUpdates, gamesById, lastSevenDays]);

  const news = useMemo(() => {
    return posts
      .filter((post) => post.type === "news" && post.isActive !== false)
      .sort((a, b) => {
        const dateA = new Date(a.publishedAtUtc || a.createdAtUtc || a.created_date || 0).getTime();
        const dateB = new Date(b.publishedAtUtc || b.createdAtUtc || b.created_date || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [posts]);

  const undefeatedTeams = useMemo(() => {
    const records = buildTeamRecords(games);

    return Array.from(records.values())
      .filter((record) => record.played > 0 && record.losses === 0)
      .map((record) => ({
        record,
        team: teamsById.get(record.teamId),
      }))
      .filter((item) => item.team)
      .sort((a, b) => b.record.wins - a.record.wins)
      .slice(0, 8);
  }, [games, teamsById]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24">
      <div className="space-y-6">
        <Hero
          liveCount={liveGames.length}
          upcomingCount={upcomingGames.length}
          leaguesCount={leagues.length}
        />

        {liveGames.length > 0 && (
          <section>
            <SectionTitle icon={Zap} title="Live Games" to="/match-center" />
            <div className="space-y-3">
              {liveGames.map((game) => (
                <ScoreCard key={game.id} game={game} teamsById={teamsById} leaguesById={leaguesById} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle icon={Play} title="Game Highlights" to="/highlights" />
          {highlights.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar">
              <div className="flex gap-3 pb-1">
                {highlights.map((item) => (
                  <HighlightCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyStrip label="Keine Highlights" />
          )}
        </section>

        {gameOfTheWeek && (
          <section>
            <SectionTitle icon={Star} title="Game of the Week" />
            <ScoreCard
              game={gameOfTheWeek}
              teamsById={teamsById}
              leaguesById={leaguesById}
              featured
            />
          </section>
        )}

        {news.length > 0 && (
          <section>
            <SectionTitle icon={Newspaper} title="News" to="/feed" />
            <div className="space-y-3">
              {news.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <PodcastCard podcast={podcast} />

        {undefeatedTeams.length > 0 && (
          <section>
            <SectionTitle icon={ShieldCheck} title="Siegesserien" />
            <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar">
              <div className="flex gap-3 pb-1">
                {undefeatedTeams.map((item) => (
                  <StreakCard key={item.team.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section>
          <SectionTitle icon={Camera} title="GameDay Shots" />
          {shots.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar">
              <div className="flex gap-3 pb-1">
                {shots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    game={gamesById.get(shot.game_id)}
                    teamsById={teamsById}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyStrip label="Noch keine GameDay Shots" />
          )}
        </section>

        <section>
          <SectionTitle icon={CalendarDays} title="Kommende Spiele" to="/match-center" />
          {upcomingGames.length > 0 ? (
            <div className="space-y-3">
              {upcomingGames.map((game) => (
                <ScoreCard key={game.id} game={game} teamsById={teamsById} leaguesById={leaguesById} />
              ))}
            </div>
          ) : (
            <EmptyStrip label="Keine kommenden Spiele" />
          )}
        </section>

        <Link
          to="/match-center"
          className="flex items-center justify-between rounded-[26px] bg-red-600 px-4 py-4 text-white"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-white/70">Alles an einem Ort</p>
            <p className="text-lg font-black">Match Center oeffnen</p>
          </div>
          <Trophy className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}
