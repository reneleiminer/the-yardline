import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@the-yardline.com";

export function sendJson(res, status, data) {
  res.status(status).json(data);
}

export function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function configureWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("Missing VAPID environment variables.");
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function normalizeSubscription(subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };
}

export async function fetchTeamMap(supabase, games) {
  const ids = Array.from(
    new Set(
      games
        .flatMap((game) => [game.home_team_id, game.away_team_id])
        .filter(Boolean)
    )
  );

  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("teams")
    .select("id,name,short_name,logo")
    .in("id", ids);

  if (error) throw error;

  return new Map((data || []).map((team) => [team.id, team]));
}

export function getGameTeams(game, teamsById) {
  const home = teamsById.get(game.home_team_id);
  const away = teamsById.get(game.away_team_id);

  return {
    homeName: home?.name || game.home_team_placeholder || "Heimteam",
    awayName: away?.name || game.away_team_placeholder || "Auswärtsteam",
    homeLogo: home?.logo || "",
    awayLogo: away?.logo || "",
  };
}

export function parseUpdateMessage(update) {
  if (!update?.message) return {};

  try {
    const parsed = JSON.parse(update.message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function claimEvent(supabase, event) {
  const { error } = await supabase
    .from("sent_push_events")
    .insert({
      event_key: event.key,
      event_type: event.type,
      payload: event.payload,
    });

  if (!error) return true;
  if (error.code === "23505") return false;

  throw error;
}

export async function sendToAllSubscriptions(supabase, notification) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,subscription")
    .eq("active", true);

  if (error) throw error;

  const sender = configureWebPush();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    (subscriptions || []).map(async (row) => {
      try {
        await sender.sendNotification(row.subscription, JSON.stringify(notification));
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

  return { sent, failed };
}
