import {
  claimEvent,
  configureWebPush,
  fetchTeamMap,
  getAdminClient,
  getGameTeams,
  parseUpdateMessage,
  sendJson,
} from "../_push.js";


const LOOKBACK_HOURS = 48;

const DEFAULT_PUSH_PREFERENCES = {
  todayGames: { enabled: true, scope: "all" },
  liveGames: { enabled: true, scope: "all" },
  favoriteTeamResults: { enabled: true, scope: "favorite" },
  gotw: { enabled: true, scope: "all" },
  podcast: { enabled: true, scope: "all" },
  gamedayShots: { enabled: true, scope: "all" },
  gameHighlights: { enabled: true, scope: "all" },
  news: { enabled: true, scope: "all" },
  transfers: { enabled: true, scope: "all" },
  weeklyStreaks: { enabled: true, scope: "all" },
};

const BRAND_ICON = "/yardline-icon-192.png";
const BRAND_BADGE = "/yardline-icon-180.png";
const BRAND_IMAGE = "/yardline-logo.png";

function styleNotification(payload = {}, options = {}) {
  return {
    ...payload,
    title: payload.title ? `THE YARDLINE | ${payload.title}` : "THE YARDLINE | Update",
    icon: payload.icon || BRAND_ICON,
    badge: payload.badge || BRAND_BADGE,
    image: payload.image || options.image || BRAND_IMAGE,
    timestamp: Date.now(),
    vibrate: options.urgent ? [180, 80, 180, 80, 220] : [120, 60, 120],
    requireInteraction: options.urgent === true,
    actions: payload.actions || [
      {
        action: "open",
        title: options.actionTitle || "Oeffnen",
      },
    ],
  };
}

function normalizePreferences(value = {}) {
  return Object.entries(DEFAULT_PUSH_PREFERENCES).reduce((prefs, [key, fallback]) => {
    const current = value?.[key] || {};
    prefs[key] = {
      enabled: current.enabled !== undefined ? current.enabled === true : fallback.enabled,
      scope: current.scope === "favorite" ? "favorite" : fallback.scope,
    };
    return prefs;
  }, {});
}

function getEventCategory(event) {
  return event.category || event.type || "";
}

function getSubscriptionPayload(subscription) {
  return {
    endpoint: subscription?.endpoint,
    keys: subscription?.keys,
  };
}

function shouldReceiveEvent(subscription, event) {
  const yardline = subscription?.yardline || {};
  const preferences = normalizePreferences(yardline.preferences || {});
  const category = getEventCategory(event);
  const preference = preferences[category];

  if (!preference?.enabled) return false;

  const targetTeamIds = new Set((event.targetTeamIds || []).filter(Boolean));
  if (event.favoriteOnly || (targetTeamIds.size > 0 && preference.scope === "favorite")) {
    return Boolean(yardline.favoriteTeamId && targetTeamIds.has(yardline.favoriteTeamId));
  }

  return true;
}

async function sendEventToSubscriptions(supabase, event) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,subscription")
    .eq("active", true);

  if (error) throw error;

  const sender = configureWebPush();
  let sent = 0;
  let failed = 0;
  let eligible = 0;
  const totalSubscriptions = (subscriptions || []).length;

  await Promise.all(
    (subscriptions || [])
      .filter((row) => {
        const allowed = shouldReceiveEvent(row.subscription, event);
        if (allowed) eligible += 1;
        return allowed;
      })
      .map(async (row) => {
        try {
          await sender.sendNotification(
            getSubscriptionPayload(row.subscription),
            JSON.stringify(styleNotification(event.payload, {
              urgent:
                event.urgent === true ||
                event.type === "live_game" ||
                event.type === "live_score_update" ||
                event.type === "favorite_live_score" ||
                event.type === "favorite_final_score",
            }))
          );
          sent += 1;
        } catch (error) {
          failed += 1;

          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .update({ active: false, updated_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }
      })
  );

  return { sent, failed, eligible, totalSubscriptions };
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function getUpdateTimestamp(update) {
  return update.updated_at || update.published_at_utc || update.created_at || "";
}

function getBerlinDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatGameTime(game) {
  return String(game.kickoff_time || game.time || "").slice(0, 5) || "offen";
}

async function buildLiveGameEvents(supabase) {
  const { data: games, error } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,updated_at")
    .eq("status", "live")
    .gte("updated_at", hoursAgo(LOOKBACK_HOURS))
    .limit(25);

  if (error) throw error;

  const teamsById = await fetchTeamMap(supabase, games || []);

  return (games || []).map((game) => {
    const teams = getGameTeams(game, teamsById);

    return {
      key: `live_game:${game.id}`,
      type: "live_game",
      category: "liveGames",
      targetTeamIds: [game.home_team_id, game.away_team_id].filter(Boolean),
      payload: {
        title: "Spiel ist live",
        body: `${teams.homeName} vs ${teams.awayName} läuft jetzt.`,
        url: `/game/${game.id}`,
        tag: `live_game:${game.id}`,
        icon: teams.homeLogo || teams.awayLogo || "/yardline-icon-192.png",
      },
    };
  });
}

async function buildGameOfTheWeekEvents(supabase) {
  const { data: games, error } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,game_of_the_week_label,game_of_the_week_selected_at_utc,updated_at")
    .eq("is_game_of_the_week", true)
    .limit(5);

  if (error) throw error;

  const teamsById = await fetchTeamMap(supabase, games || []);

  return (games || []).map((game) => {
    const teams = getGameTeams(game, teamsById);
    const selectedAt = game.game_of_the_week_selected_at_utc || game.updated_at || "";
    const label = game.game_of_the_week_label || "EuroFBShow";

    return {
      key: `gotw:${game.id}:${selectedAt}`,
      type: "game_of_the_week",
      category: "gotw",
      targetTeamIds: [game.home_team_id, game.away_team_id].filter(Boolean),
      payload: {
        title: "Neues Game of the Week",
        body: `${teams.homeName} vs ${teams.awayName} wurde von ${label} ausgewählt.`,
        url: `/game/${game.id}`,
        tag: `gotw:${game.id}`,
        icon: "/yardline-icon-192.png",
      },
    };
  });
}

async function buildTodaysGameEvents(supabase) {
  const today = getBerlinDateKey();
  const { data: games, error } = await supabase
    .from("games")
    .select("id,date,kickoff_time,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,status")
    .eq("date", today)
    .neq("status", "cancelled")
    .order("kickoff_time", { ascending: true })
    .limit(30);

  if (error) throw error;
  if (!games?.length) return [];

  const teamsById = await fetchTeamMap(supabase, games);
  const lines = games.slice(0, 3).map((game) => {
    const teams = getGameTeams(game, teamsById);
    return `${teams.homeName} vs ${teams.awayName} (${formatGameTime(game)})`;
  });

  const extra = games.length > 3 ? ` +${games.length - 3} weitere` : "";
  const firstGame = games[0];
  const firstTeams = getGameTeams(firstGame, teamsById);

  return [{
    key: `today_games:${today}:${games.map((game) => game.id).join(",")}`,
    type: "today_games",
    category: "todayGames",
    payload: {
      title: games.length === 1 ? "Heute steht ein Spiel an" : `Heute stehen ${games.length} Spiele an`,
      body: `${lines.join(" · ")}${extra}`,
      url: games.length === 1 ? `/game/${firstGame.id}` : "/match-center",
      tag: `today_games:${today}`,
      icon: firstTeams.homeLogo || firstTeams.awayLogo || "/yardline-icon-192.png",
    },
  }];
}

async function buildPodcastEvents(supabase) {
  const { data: updates, error } = await supabase
    .from("app_updates")
    .select("id,title,message,updated_at,created_at")
    .eq("version", "podcast_feature")
    .eq("is_active", true)
    .gte("updated_at", hoursAgo(LOOKBACK_HOURS))
    .limit(5);

  if (error) throw error;

  return (updates || []).map((update) => {
    const data = parseUpdateMessage(update);
    const episodeTitle = data.episodeTitle || data.episode_title || update.title || "Neue Folge";
    const partnerName = data.partnerName || data.partner_name || "Football Germany";

    return {
      key: `podcast:${update.id}:${getUpdateTimestamp(update)}`,
      type: "podcast_feature",
      category: "podcast",
      payload: {
        title: "Neue Podcast-Folge",
        body: `${episodeTitle} von ${partnerName}`,
        url: "/",
        tag: `podcast:${update.id}`,
        icon: "/yardline-icon-192.png",
      },
    };
  });
}

async function buildHighlightEvents(supabase) {
  const { data: updates, error } = await supabase
    .from("app_updates")
    .select("id,title,message,image_url,created_at,updated_at")
    .eq("version", "game_highlight")
    .eq("is_active", true)
    .gte("created_at", hoursAgo(LOOKBACK_HOURS))
    .limit(10);

  if (error) throw error;

  return (updates || []).map((update) => {
    const meta = parseUpdateMessage(update);
    return {
      key: `highlight:${update.id}:${update.created_at || update.updated_at || ""}`,
      type: "game_highlight",
      category: "gameHighlights",
      targetTeamIds: [
        ...(Array.isArray(meta.team_ids) ? meta.team_ids : []),
        meta.team_id,
        meta.home_team_id,
        meta.away_team_id,
      ].filter(Boolean),
      payload: {
        title: "Neues Game Highlight",
        body: update.title || "Ein neues Highlight ist online.",
        url: "/highlights",
        tag: `highlight:${update.id}`,
        icon: "/yardline-icon-192.png",
        image: update.image_url || undefined,
      },
    };
  });
}

async function buildGamedayShotEvents(supabase) {
  const { data: updates, error } = await supabase
    .from("app_updates")
    .select("id,title,message,image_url,created_at,updated_at")
    .eq("version", "gameday_photo")
    .eq("is_active", true)
    .gte("created_at", hoursAgo(LOOKBACK_HOURS))
    .limit(20);

  if (error) throw error;

  return (updates || []).map((update) => {
    const meta = parseUpdateMessage(update);
    return {
      key: `gameday_shot:${update.id}:${update.created_at || update.updated_at || ""}`,
      type: "gameday_shot",
      category: "gamedayShots",
      targetTeamIds: [
        ...(Array.isArray(meta.team_ids) ? meta.team_ids : []),
        meta.team_id,
        meta.home_team_id,
        meta.away_team_id,
      ].filter(Boolean),
      payload: {
        title: "Neue GameDay Shots",
        body: update.title || meta.caption || "Neue Bilder vom Spieltag sind online.",
        url: "/",
        tag: `gameday_shot:${update.id}`,
        icon: meta.team_logo || "/yardline-icon-192.png",
        image: update.image_url || meta.image_url || undefined,
      },
    };
  });
}

async function buildPostEvents(supabase) {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id,type,title,teaser,text,image_url,author_username,published_at_utc,created_at,updated_at,is_hidden,is_deleted,team_ids,team_id,connected_team_id")
    .in("type", ["news", "transfer"])
    .or("is_hidden.is.null,is_hidden.eq.false")
    .or("is_deleted.is.null,is_deleted.eq.false")
    .gte("created_at", hoursAgo(LOOKBACK_HOURS))
    .limit(20);

  if (error) throw error;

  return (posts || []).map((post) => {
    const isTransfer = post.type === "transfer";
    const timestamp = post.published_at_utc || post.created_at || post.updated_at || "";
    const author = post.author_username ? ` von ${post.author_username}` : "";

    return {
      key: `post:${post.id}:${timestamp}`,
      type: isTransfer ? "transfer" : "news",
      category: isTransfer ? "transfers" : "news",
      targetTeamIds: [
        ...(Array.isArray(post.team_ids) ? post.team_ids : []),
        post.team_id,
        post.connected_team_id,
      ].filter(Boolean),
      payload: {
        title: isTransfer ? "Neuer Transfer" : "Neue News",
        body: `${post.title || (isTransfer ? "Transfer Update" : "News Update")}${author}`,
        url: `/post/${post.id}`,
        tag: `post:${post.id}`,
        icon: "/yardline-icon-192.png",
        image: post.image_url || undefined,
      },
    };
  });
}


function getWinnerText(game, teams) {
  const homeScore = Number(game.score_home ?? 0);
  const awayScore = Number(game.score_away ?? 0);

  if (homeScore > awayScore) return `${teams.homeName} gewinnt`;
  if (awayScore > homeScore) return `${teams.awayName} gewinnt`;
  return "Unentschieden";
}


async function buildLiveScoreUpdateEvents(supabase) {
  const { data: games, error } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,score_home,score_away,status,updated_at")
    .eq("status", "live")
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .gte("updated_at", hoursAgo(LOOKBACK_HOURS))
    .limit(50);

  if (error) throw error;

  const teamsById = await fetchTeamMap(supabase, games || []);

  return (games || []).map((game) => {
    const teams = getGameTeams(game, teamsById);
    const score = `${Number(game.score_home)}:${Number(game.score_away)}`;

    return {
      key: `live_score_update:${game.id}:${game.updated_at || ""}:${score}`,
      type: "live_score_update",
      category: "liveGames",
      targetTeamIds: [game.home_team_id, game.away_team_id].filter(Boolean),
      urgent: true,
      payload: {
        title: "Neuer Live-Score",
        body: `${teams.homeName} ${score} ${teams.awayName}`,
        url: `/game/${game.id}`,
        tag: `live_score_update:${game.id}`,
        icon: teams.homeLogo || teams.awayLogo || "/yardline-icon-192.png",
        renotify: true,
      },
    };
  });
}

async function buildFavoriteLiveScoreEvents(supabase) {
  const { data: games, error } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,score_home,score_away,status,updated_at")
    .eq("status", "live")
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .gte("updated_at", hoursAgo(LOOKBACK_HOURS))
    .limit(50);

  if (error) throw error;

  const teamsById = await fetchTeamMap(supabase, games || []);

  return (games || []).map((game) => {
    const teams = getGameTeams(game, teamsById);
    const score = `${Number(game.score_home)}:${Number(game.score_away)}`;

    return {
      key: `favorite_live_score:${game.id}:${game.updated_at || ""}:${score}`,
      type: "favorite_live_score",
      category: "favoriteTeamResults",
      targetTeamIds: [game.home_team_id, game.away_team_id].filter(Boolean),
      favoriteOnly: true,
      urgent: true,
      payload: {
        title: "Neuer Score für dein Team",
        body: `${teams.homeName} ${score} ${teams.awayName}`,
        url: `/game/${game.id}`,
        tag: `favorite_live_score:${game.id}`,
        icon: teams.homeLogo || teams.awayLogo || "/yardline-icon-192.png",
        renotify: true,
      },
    };
  });
}

async function buildFavoriteFinalScoreEvents(supabase) {
  const { data: games, error } = await supabase
    .from("games")
    .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,score_home,score_away,status,updated_at")
    .eq("status", "final")
    .not("score_home", "is", null)
    .not("score_away", "is", null)
    .gte("updated_at", hoursAgo(LOOKBACK_HOURS))
    .limit(50);

  if (error) throw error;

  const teamsById = await fetchTeamMap(supabase, games || []);

  return (games || []).map((game) => {
    const teams = getGameTeams(game, teamsById);
    const winnerText = getWinnerText(game, teams);
    const score = `${Number(game.score_home)}:${Number(game.score_away)}`;

    return {
      key: `favorite_final:${game.id}:${game.updated_at || ""}:${score}`,
      type: "favorite_final_score",
      category: "favoriteTeamResults",
      targetTeamIds: [game.home_team_id, game.away_team_id].filter(Boolean),
      favoriteOnly: true,
      payload: {
        title: "Endstand für dein Team",
        body: `${winnerText} · ${teams.homeName} ${score} ${teams.awayName}`,
        url: `/game/${game.id}`,
        tag: `favorite_final:${game.id}`,
        icon: teams.homeLogo || teams.awayLogo || "/yardline-icon-192.png",
        renotify: true,
      },
    };
  });
}

async function buildWeeklyStreakEvents(supabase) {
  const today = new Date();
  const berlinWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "short",
  }).format(today);

  if (berlinWeekday !== "Sun") return [];

  const weekStart = new Date(today);
  weekStart.setUTCDate(today.getUTCDate() - 6);
  const fromDate = getBerlinDateKey(weekStart);
  const toDate = getBerlinDateKey(today);

  const { data: games, error } = await supabase
    .from("games")
    .select("id,league_id,home_team_id,away_team_id,score_home,score_away,status,date")
    .gte("date", fromDate)
    .lte("date", toDate)
    .neq("status", "cancelled")
    .limit(500);

  if (error) throw error;
  if (!games?.length || games.some((game) => game.status !== "final")) return [];

  const teamIds = Array.from(new Set(games.flatMap((game) => [game.home_team_id, game.away_team_id]).filter(Boolean)));
  const leagueIds = Array.from(new Set(games.map((game) => game.league_id).filter(Boolean)));

  const [{ data: teams, error: teamsError }, { data: leagues, error: leaguesError }] = await Promise.all([
    supabase.from("teams").select("id,name,short_name,league_id").in("id", teamIds),
    supabase.from("leagues").select("id,name,short_name").in("id", leagueIds),
  ]);

  if (teamsError) throw teamsError;
  if (leaguesError) throw leaguesError;

  const teamsById = new Map((teams || []).map((team) => [team.id, team]));
  const leaguesById = new Map((leagues || []).map((league) => [league.id, league]));
  const records = new Map();

  games.forEach((game) => {
    const homeScore = Number(game.score_home || 0);
    const awayScore = Number(game.score_away || 0);
    [game.home_team_id, game.away_team_id].filter(Boolean).forEach((teamId) => {
      if (!records.has(teamId)) records.set(teamId, { teamId, leagueId: teamsById.get(teamId)?.league_id || game.league_id, wins: 0, losses: 0, played: 0 });
    });

    const home = records.get(game.home_team_id);
    const away = records.get(game.away_team_id);
    if (home) home.played += 1;
    if (away) away.played += 1;

    if (homeScore > awayScore) {
      if (home) home.wins += 1;
      if (away) away.losses += 1;
    } else if (awayScore > homeScore) {
      if (away) away.wins += 1;
      if (home) home.losses += 1;
    }
  });

  const byLeague = new Map();
  Array.from(records.values())
    .filter((record) => record.played > 0 && record.losses === 0 && record.wins > 0)
    .forEach((record) => {
      const current = byLeague.get(record.leagueId) || [];
      current.push(record);
      byLeague.set(record.leagueId, current);
    });

  return Array.from(byLeague.entries()).map(([leagueId, rows]) => {
    const league = leaguesById.get(leagueId);
    const names = rows
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 4)
      .map((record) => `${teamsById.get(record.teamId)?.short_name || teamsById.get(record.teamId)?.name || "Team"} (${record.wins}-0)`);

    return {
      key: `weekly_streaks:${toDate}:${leagueId}:${names.join("|")}`,
      type: "weekly_streaks",
      category: "weeklyStreaks",
      payload: {
        title: `Siegesserien ${league?.short_name || league?.name || ""}`.trim(),
        body: names.length ? names.join(" · ") : "Alle Wochenendspiele sind final.",
        url: "/",
        tag: `weekly_streaks:${toDate}:${leagueId}`,
        icon: "/yardline-icon-192.png",
      },
    };
  });
}


export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const supabase = getAdminClient();
    const groups = await Promise.all([
      buildLiveGameEvents(supabase),
      buildGameOfTheWeekEvents(supabase),
      buildTodaysGameEvents(supabase),
      buildPodcastEvents(supabase),
      buildHighlightEvents(supabase),
      buildGamedayShotEvents(supabase),
      buildPostEvents(supabase),
      buildLiveScoreUpdateEvents(supabase),
      buildFavoriteLiveScoreEvents(supabase),
      buildFavoriteFinalScoreEvents(supabase),
      buildWeeklyStreakEvents(supabase),
    ]);

    const events = groups.flat();
    let claimed = 0;
    let sent = 0;
    let failed = 0;
    let eligible = 0;
    let totalSubscriptions = 0;

    for (const event of events) {
      const canSend = await claimEvent(supabase, event);
      if (!canSend) continue;

      claimed += 1;
      const result = await sendEventToSubscriptions(supabase, event);

      sent += result.sent;
      failed += result.failed;
      eligible += result.eligible || 0;
      totalSubscriptions = Math.max(totalSubscriptions, result.totalSubscriptions || 0);
    }

    return sendJson(res, 200, {
      status: "success",
      checked: events.length,
      claimed,
      sent,
      failed,
      eligible,
      totalSubscriptions,
    });
  } catch (error) {
    console.error("PUSH CHECK ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Push check failed." });
  }
}
