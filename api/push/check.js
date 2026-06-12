import {
  claimEvent,
  fetchTeamMap,
  getAdminClient,
  getGameTeams,
  parseUpdateMessage,
  sendJson,
  sendToAllSubscriptions,
} from "../_push.js";

const LOOKBACK_HOURS = 48;

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

  return (updates || []).map((update) => ({
    key: `highlight:${update.id}:${update.created_at || update.updated_at || ""}`,
    type: "game_highlight",
    payload: {
      title: "Neues Game Highlight",
      body: update.title || "Ein neues Highlight ist online.",
      url: "/highlights",
      tag: `highlight:${update.id}`,
      icon: "/yardline-icon-192.png",
      image: update.image_url || undefined,
    },
  }));
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
    ]);

    const events = groups.flat();
    let claimed = 0;
    let sent = 0;
    let failed = 0;

    for (const event of events) {
      const canSend = await claimEvent(supabase, event);
      if (!canSend) continue;

      claimed += 1;
      const result = await sendToAllSubscriptions(supabase, event.payload);
      sent += result.sent;
      failed += result.failed;
    }

    return sendJson(res, 200, {
      status: "success",
      checked: events.length,
      claimed,
      sent,
      failed,
    });
  } catch (error) {
    console.error("PUSH CHECK ERROR:", error);
    return sendJson(res, 500, { error: error.message || "Push check failed." });
  }
}
