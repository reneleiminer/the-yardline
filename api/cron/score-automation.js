import { createClient } from "@supabase/supabase-js";
import {
  isScorePlausible,
  matchExternalScoreToGame,
  shouldApplySafeUpdate,
} from "../../src/lib/scoreAutomation/matching.js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, data) {
  res.status(status).json(data);
}

function getSecret(req) {
  return req.headers["x-score-automation-secret"] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ||
    "";
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["final", "finished", "ft"].includes(status)) return "final";
  if (["live", "in_progress", "halftime"].includes(status)) return "live";
  if (["scheduled", "pre"].includes(status)) return "scheduled";
  return "";
}

async function fetchProviderGames(provider) {
  if (!provider.source_url || provider.source_type !== "json_feed") {
    return { status: "not_configured", games: [], error: "Provider has no configured supported source." };
  }

  const response = await fetch(provider.source_url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : payload.games;

  if (!Array.isArray(items)) {
    throw new Error("JSON feed must be an array or an object with a games array.");
  }

  return {
    status: "success",
    games: items
      .map(item => ({
        externalGameId: String(item.id || item.external_game_id || item.externalGameId || ""),
        leagueId: provider.league_id || item.league_id || item.leagueId || "",
        homeTeamName: item.home_team_name || item.homeTeamName || item.home || "",
        awayTeamName: item.away_team_name || item.awayTeamName || item.away || "",
        homeTeamId: item.home_team_id || item.homeTeamId || "",
        awayTeamId: item.away_team_id || item.awayTeamId || "",
        homeScore: Number(item.home_score ?? item.homeScore),
        awayScore: Number(item.away_score ?? item.awayScore),
        status: normalizeStatus(item.status),
        kickoff: item.kickoff || item.kickoff_at || item.kickoffAt || "",
        sourceUrl: item.source_url || item.sourceUrl || provider.source_url,
        raw: item,
      }))
      .filter(item => item.externalGameId && item.homeTeamName && item.awayTeamName && isScorePlausible(item.homeScore, item.awayScore)),
  };
}

async function applyScoreUpdate(supabase, game, externalGame, providerKey) {
  const nextStatus = externalGame.status === "final" ? "final" : externalGame.status === "live" ? "live" : game.status;

  const { error: updateError } = await supabase
    .from("games")
    .update({
      score_home: externalGame.homeScore,
      score_away: externalGame.awayScore,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", game.id);

  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from("score_update_logs")
    .insert({
      game_id: game.id,
      provider_key: providerKey,
      old_home_score: game.score_home,
      old_away_score: game.score_away,
      new_home_score: externalGame.homeScore,
      new_away_score: externalGame.awayScore,
      old_status: game.status,
      new_status: nextStatus,
      update_source: "automation",
    });

  if (logError) throw logError;
}

async function processProvider(supabase, provider) {
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("score_import_runs")
    .insert({
      provider_key: provider.provider_key,
      league_id: provider.league_id,
      started_at: startedAt,
      status: provider.is_enabled ? "running" : "disabled",
    })
    .select()
    .single();

  if (runError) throw runError;
  if (!provider.is_enabled) return { provider: provider.provider_key, status: "disabled" };

  try {
    const feed = await fetchProviderGames(provider);
    if (feed.status !== "success") {
      await supabase
        .from("score_import_runs")
        .update({ status: feed.status, finished_at: new Date().toISOString(), error_message: feed.error })
        .eq("id", run.id);

      return { provider: provider.provider_key, status: feed.status };
    }

    let gamesQuery = supabase
      .from("games")
      .select("id,league_id,home_team_id,away_team_id,home_team_placeholder,away_team_placeholder,date,time,kickoff_time,kickoff_at,status,score_home,score_away");

    if (provider.league_id) {
      gamesQuery = gamesQuery.eq("league_id", provider.league_id);
    }

    const [{ data: games, error: gamesError }, { data: teamMappings, error: teamError }, { data: gameMappings, error: gameError }] = await Promise.all([
      gamesQuery,
      supabase.from("external_team_mappings").select("*").eq("provider_key", provider.provider_key),
      supabase.from("external_game_mappings").select("*").eq("provider_key", provider.provider_key),
    ]);

    if (gamesError) throw gamesError;
    if (teamError) throw teamError;
    if (gameError) throw gameError;

    let gamesMatched = 0;
    let scoresUpdated = 0;
    let suggestionsCreated = 0;
    let conflictsFound = 0;

    for (const externalGame of feed.games) {
      const match = matchExternalScoreToGame({
        externalGame,
        games: games || [],
        teamMappings: teamMappings || [],
        gameMappings: gameMappings || [],
        providerKey: provider.provider_key,
      });

      if (!match.game) continue;
      gamesMatched += 1;

      const status = match.conflict ? "conflict" : "pending";
      if (status === "conflict") conflictsFound += 1;

      if (shouldApplySafeUpdate({ match, externalGame })) {
        await applyScoreUpdate(supabase, match.game, externalGame, provider.provider_key);
        scoresUpdated += 1;
        continue;
      }

      const { error: suggestionError } = await supabase
        .from("score_import_suggestions")
        .insert({
          provider_key: provider.provider_key,
          league_id: provider.league_id,
          game_id: match.game.id,
          external_game_id: externalGame.externalGameId,
          detected_home_score: externalGame.homeScore,
          detected_away_score: externalGame.awayScore,
          detected_status: externalGame.status || null,
          detected_kickoff: externalGame.kickoff || null,
          detected_home_team_name: externalGame.homeTeamName,
          detected_away_team_name: externalGame.awayTeamName,
          current_home_score: match.game.score_home,
          current_away_score: match.game.score_away,
          current_status: match.game.status,
          confidence: match.confidence,
          source_url: externalGame.sourceUrl,
          raw_payload: { reason: match.reason, external: externalGame.raw },
          status,
        });

      if (suggestionError) throw suggestionError;
      suggestionsCreated += 1;
    }

    const summary = {
      games_checked: feed.games.length,
      games_matched: gamesMatched,
      scores_found: feed.games.length,
      scores_updated: scoresUpdated,
      suggestions_created: suggestionsCreated,
      conflicts_found: conflictsFound,
    };

    await supabase.from("score_import_runs").update({
      ...summary,
      status: "success",
      finished_at: new Date().toISOString(),
      raw_summary: summary,
    }).eq("id", run.id);

    await supabase.from("score_providers").update({
      last_run_at: startedAt,
      last_success_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("provider_key", provider.provider_key);

    return { provider: provider.provider_key, status: "success", ...summary };
  } catch (error) {
    await supabase.from("score_import_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: error.message,
    }).eq("id", run.id);

    await supabase.from("score_providers").update({
      last_run_at: startedAt,
      last_error: error.message,
      updated_at: new Date().toISOString(),
    }).eq("provider_key", provider.provider_key);

    return { provider: provider.provider_key, status: "failed", error: error.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!process.env.SCORE_AUTOMATION_SECRET || getSecret(req) !== process.env.SCORE_AUTOMATION_SECRET) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    const supabase = getAdminClient();
    const { data: providers, error } = await supabase
      .from("score_providers")
      .select("*")
      .eq("is_enabled", true);

    if (error) throw error;

    const results = [];
    for (const provider of providers || []) {
      results.push(await processProvider(supabase, provider));
    }

    return sendJson(res, 200, { ok: true, providers_checked: results.length, results });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
}
