import {
  configureWebPush,
  fetchTeamMap,
  getAdminClient,
  getGameTeams,
  readBody,
  sendJson,
} from "../_push.js";

const DEFAULT_PUSH_PREFERENCES = {
  liveGames: { enabled: true, scope: "all" },
  favoriteTeamResults: { enabled: true, scope: "favorite" },
};

const BRAND_ICON = "/yardline-icon-192.png";
const BRAND_BADGE = "/yardline-icon-180.png";

function normalizePreferences(value = {}) {
  return {
    liveGames: {
      enabled: value?.liveGames?.enabled !== undefined ? value.liveGames.enabled === true : true,
      scope: value?.liveGames?.scope === "favorite" ? "favorite" : "all",
    },
    favoriteTeamResults: {
      enabled: value?.favoriteTeamResults?.enabled !== undefined ? value.favoriteTeamResults.enabled === true : true,
      scope: "favorite",
    },
  };
}

function getSubscriptionPayload(subscription) {
  return {
    endpoint: subscription?.endpoint,
    keys: subscription?.keys,
  };
}

function subscriptionMatchesScore(row, game, status) {
  const yardline = row.subscription?.yardline || {};
  const preferences = normalizePreferences(yardline.preferences || {});
  const favoriteTeamId = yardline.favoriteTeamId || "";
  const teamIds = new Set([game.home_team_id, game.away_team_id].filter(Boolean));
  const favoriteMatches = Boolean(favoriteTeamId && teamIds.has(favoriteTeamId));

  if (status === "final") {
    return preferences.favoriteTeamResults.enabled && favoriteMatches;
  }

  if (preferences.liveGames.enabled) {
    if (preferences.liveGames.scope !== "favorite") return true;
    if (favoriteMatches) return true;
  }

  if (preferences.favoriteTeamResults.enabled && favoriteMatches) {
    return true;
  }

  return false;
}

function buildNotification({ game, teams, status }) {
  const homeScore = Number(game.score_home ?? 0);
  const awayScore = Number(game.score_away ?? 0);
  const score = `${homeScore}:${awayScore}`;
  const isFinal = status === "final";

  return {
    title: isFinal
      ? "THE YARDLINE | Final Score"
      : "THE YARDLINE | Neuer Live-Score",
    body: `${teams.homeName} ${score} ${teams.awayName}`,
    icon: teams.homeLogo || teams.awayLogo || BRAND_ICON,
    badge: BRAND_BADGE,
    tag: `${isFinal ? "final_score" : "live_score"}:${game.id}:${score}`,
    renotify: true,
    timestamp: Date.now(),
    vibrate: isFinal ? [160, 80, 160] : [180, 80, 180, 80, 220],
    requireInteraction: false,
    data: {
      url: `/game/${game.id}`,
    },
    actions: [
      {
        action: "open",
        title: "Zum Spiel",
      },
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const gameId = body.gameId || body.game_id;

    if (!gameId) {
      return sendJson(res, 400, { error: "Missing gameId." });
    }

    const supabase = getAdminClient();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,score_home,score_away,status,updated_at")
      .eq("id", gameId)
      .single();

    if (gameError) throw gameError;
    if (!game) return sendJson(res, 404, { error: "Game not found." });

    const status = String(body.status || game.status || "live").toLowerCase();
    if (!["live", "final"].includes(status)) {
      return sendJson(res, 200, {
        status: "skipped",
        reason: "Game is not live/final.",
        sent: 0,
        failed: 0,
        eligible: 0,
        totalSubscriptions: 0,
      });
    }

    const teamsById = await fetchTeamMap(supabase, [game]);
    const teams = getGameTeams(game, teamsById);

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id,subscription")
      .eq("active", true);

    if (subError) throw subError;

    const totalSubscriptions = (subscriptions || []).length;
    const eligibleRows = (subscriptions || []).filter((row) =>
      subscriptionMatchesScore(row, game, status)
    );

    const sender = configureWebPush();
    const notification = buildNotification({ game, teams, status });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      eligibleRows.map(async (row) => {
        try {
          await sender.sendNotification(
            getSubscriptionPayload(row.subscription),
            JSON.stringify(notification)
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

    return sendJson(res, 200, {
      status: "success",
      sent,
      failed,
      eligible: eligibleRows.length,
      totalSubscriptions,
      gameId: game.id,
      gameStatus: status,
      score: `${Number(game.score_home ?? 0)}:${Number(game.score_away ?? 0)}`,
    });
  } catch (error) {
    console.error("DIRECT SCORE PUSH ERROR:", error);
    return sendJson(res, 500, {
      error: error.message || "Direct score push failed.",
      statusCode: error.statusCode || null,
      body: error.body || null,
    });
  }
}
