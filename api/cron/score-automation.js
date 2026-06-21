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

const SUPPORTED_SOURCE_TYPES = new Set([
  "json_feed",
  "football_aktuell",
  "scoreboard_text",
]);

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
  const status = String(value || "").trim().toLowerCase();
  if (["final", "finished", "complete", "completed", "ft", "end", "ended"].includes(status)) return "final";
  if (["live", "in_progress", "running", "halftime", "half-time", "ht"].includes(status)) return "live";
  if (["scheduled", "pre", "upcoming", "fixture"].includes(status)) return "scheduled";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["postponed", "delayed"].includes(status)) return "postponed";
  return "";
}

function normalizeText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/g, "Ä")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/gi, "ß")
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function getCurrentYear(provider) {
  const configYear = Number(provider?.config?.year || 0);
  if (configYear > 2000) return configYear;
  return new Date().getFullYear();
}

function parseGermanDate(dateText, year) {
  const match = String(dateText || "").match(/(\d{1,2})\.(\d{1,2})\.?/);
  if (!match) return "";
  const day = String(match[1]).padStart(2, "0");
  const month = String(match[2]).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeExternalGame(item, provider) {
  const externalGameId = String(item.id || item.external_game_id || item.externalGameId || item.game_id || "").trim();
  const homeScore = Number(item.home_score ?? item.homeScore ?? item.score_home ?? item.scoreHome);
  const awayScore = Number(item.away_score ?? item.awayScore ?? item.score_away ?? item.scoreAway);

  return {
    externalGameId,
    leagueId: provider.league_id || item.league_id || item.leagueId || "",
    homeTeamName: String(item.home_team_name || item.homeTeamName || item.home || item.home_team || "").trim(),
    awayTeamName: String(item.away_team_name || item.awayTeamName || item.away || item.away_team || "").trim(),
    homeTeamId: item.home_team_id || item.homeTeamId || "",
    awayTeamId: item.away_team_id || item.awayTeamId || "",
    homeScore,
    awayScore,
    status: normalizeStatus(item.status),
    kickoff: item.kickoff || item.kickoff_at || item.kickoffAt || item.date || "",
    sourceUrl: item.source_url || item.sourceUrl || provider.source_url,
    raw: item,
  };
}

async function fetchDecodedText(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      "user-agent": "TheYardlineScoreAutomation/1.0 (+https://the-yardline.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "";
  const decoder = /charset\s*=\s*(iso-8859-1|windows-1252)/i.test(contentType)
    ? new TextDecoder("windows-1252")
    : new TextDecoder("utf-8");

  return decoder.decode(buffer);
}

function parseScoreboardText(rawText, provider) {
  const year = getCurrentYear(provider);
  const text = normalizeText(rawText)
    .replace(/\s+\(H\)\s+/g, " ")
    .replace(/\s+\(A\)\s+/g, " ")
    .replace(/\s+\(N\)\s+/g, " ");

  const candidates = [];
  const patterns = [
    /(\d{1,2}\.\d{1,2}\.)\s*(?:\d{1,2}:\d{2}\s*)?([^\n\r]{2,90}?)\s+[-–]\s+([^\n\r]{2,90}?)\s+(\d{1,3})\s*[:]\s*(\d{1,3})/g,
    /(\d{1,2}\.\d{1,2}\.)\s*(?:\d{1,2}:\d{2}\s*)?([^\n\r]{2,90}?)\s+gegen\s+([^\n\r]{2,90}?)\s+(\d{1,3})\s*[:]\s*(\d{1,3})/gi,
    /([^\n\r]{2,90}?)\s+[-–]\s+([^\n\r]{2,90}?)\s+(\d{1,3})\s*[:]\s*(\d{1,3})/g,
  ];

  patterns.forEach((pattern, patternIndex) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const hasDate = patternIndex < 2;
      const dateText = hasDate ? match[1] : "";
      const homeTeamName = String(hasDate ? match[2] : match[1]).trim().replace(/[.;:,]+$/g, "");
      const awayTeamName = String(hasDate ? match[3] : match[2]).trim().replace(/[.;:,]+$/g, "");
      const homeScore = Number(hasDate ? match[4] : match[3]);
      const awayScore = Number(hasDate ? match[5] : match[4]);
      const date = parseGermanDate(dateText, year);
      const externalGameId = [provider.provider_key, date || "unknown-date", homeTeamName, awayTeamName]
        .join("|")
        .toLowerCase()
        .replace(/[^a-z0-9äöüß|]+/gi, "_");

      if (!homeTeamName || !awayTeamName || !isScorePlausible(homeScore, awayScore)) continue;

      candidates.push({
        externalGameId,
        leagueId: provider.league_id || "",
        homeTeamName,
        awayTeamName,
        homeScore,
        awayScore,
        status: "final",
        kickoff: date,
        sourceUrl: provider.source_url,
        raw: { dateText, homeTeamName, awayTeamName, homeScore, awayScore },
      });
    }
  });

  const unique = new Map();
  candidates.forEach(game => {
    const key = `${game.externalGameId}:${game.homeScore}:${game.awayScore}`;
    if (!unique.has(key)) unique.set(key, game);
  });

  return Array.from(unique.values());
}

async function fetchJsonFeed(provider) {
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

  return items
    .map(item => normalizeExternalGame(item, provider))
    .filter(item => item.externalGameId && item.homeTeamName && item.awayTeamName && isScorePlausible(item.homeScore, item.awayScore));
}

async function fetchProviderGames(provider) {
  if (!provider.is_enabled) {
    return { status: "disabled", games: [], error: "Provider is disabled." };
  }

  if (!provider.source_url || !SUPPORTED_SOURCE_TYPES.has(provider.source_type)) {
    return { status: "not_configured", games: [], error: "Provider has no configured supported source." };
  }

  if (provider.source_type === "json_feed") {
    return { status: "success", games: await fetchJsonFeed(provider) };
  }

  if (provider.source_type === "football_aktuell" || provider.source_type === "scoreboard_text") {
    const html = await fetchDecodedText(provider.source_url);
    return { status: "success", games: parseScoreboardText(html, provider) };
  }

  return { status: "not_configured", games: [], error: "Unsupported source type." };
}

function getKickoffTime(game) {
  const value = game.kickoff_at || game.kickoffAt;
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }

  if (game.date) {
    const time = game.time || game.kickoff_time || game.kickoffTime || "00:00";
    const date = new Date(`${game.date}T${time}`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function getNextStatus(game, externalGame, options = {}) {
  const detectedStatus = normalizeStatus(externalGame.status);
  const kickoff = getKickoffTime(game);
  const now = new Date();

  if (kickoff && kickoff > now && ["live", "final"].includes(detectedStatus)) {
    return game.status || "scheduled";
  }

  if (detectedStatus === "final") return "final";
  if (detectedStatus === "live") return "live";
  if (detectedStatus === "cancelled") return "cancelled";
  if (detectedStatus === "postponed") return "postponed";
  if (options.allowUnclearStatus) return game.status || "scheduled";

  return game.status || "scheduled";
}

export async function applyScoreUpdate(supabase, game, externalGame, providerKey, options = {}) {
  const nextStatus = getNextStatus(game, externalGame, options);
  const homeScore = Number(externalGame.homeScore);
  const awayScore = Number(externalGame.awayScore);

  if (!isScorePlausible(homeScore, awayScore)) {
    throw new Error("Unplausibler Score.");
  }

  const { error: updateError } = await supabase
    .from("games")
    .update({
      score_home: homeScore,
      score_away: awayScore,
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
      new_home_score: homeScore,
      new_away_score: awayScore,
      old_status: game.status,
      new_status: nextStatus,
      update_source: options.updateSource || "automation",
      created_by: options.createdBy || null,
    });

  if (logError) throw logError;
}

async function createSuggestionIfNeeded(supabase, provider, match, externalGame, status) {
  const existingQuery = supabase
    .from("score_import_suggestions")
    .select("id,status")
    .eq("provider_key", provider.provider_key)
    .eq("game_id", match.game.id)
    .eq("detected_home_score", externalGame.homeScore)
    .eq("detected_away_score", externalGame.awayScore)
    .in("status", ["pending", "conflict"])
    .limit(1);

  const { data: existing, error: existingError } = await existingQuery;
  if (existingError) throw existingError;
  if ((existing || []).length > 0) return false;

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
  return true;
}

export async function processProvider(supabase, provider) {
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

      return { provider: provider.provider_key, status: feed.status, error: feed.error };
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

    const teamIds = Array.from(new Set((games || []).flatMap(game => [
      game.home_team_id,
      game.away_team_id,
    ]).filter(Boolean)));

    let teamsById = new Map();
    if (teamIds.length > 0) {
      const { data: teamRows, error: teamsError } = await supabase
        .from("teams")
        .select("id,name,short_name")
        .in("id", teamIds);

      if (teamsError) throw teamsError;
      teamsById = new Map((teamRows || []).map(team => [team.id, team]));
    }

    const enrichedGames = (games || []).map(game => {
      const home = teamsById.get(game.home_team_id);
      const away = teamsById.get(game.away_team_id);

      return {
        ...game,
        home_team_name: home?.name || home?.short_name || game.home_team_placeholder || "",
        away_team_name: away?.name || away?.short_name || game.away_team_placeholder || "",
      };
    });

    let gamesMatched = 0;
    let scoresUpdated = 0;
    let suggestionsCreated = 0;
    let conflictsFound = 0;

    for (const externalGame of feed.games) {
      const match = matchExternalScoreToGame({
        externalGame,
        games: enrichedGames,
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

      const created = await createSuggestionIfNeeded(supabase, provider, match, externalGame, status);
      if (created) suggestionsCreated += 1;
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
      status: conflictsFound > 0 ? "partial" : "success",
      finished_at: new Date().toISOString(),
      raw_summary: summary,
    }).eq("id", run.id);

    await supabase.from("score_providers").update({
      last_run_at: startedAt,
      last_success_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("provider_key", provider.provider_key);

    return { provider: provider.provider_key, status: conflictsFound > 0 ? "partial" : "success", ...summary };
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

export async function runScoreAutomation(supabase, options = {}) {
  let query = supabase.from("score_providers").select("*");
  if (options.onlyEnabled !== false) query = query.eq("is_enabled", true);

  const { data: providers, error } = await query;
  if (error) throw error;

  const results = [];
  for (const provider of providers || []) {
    results.push(await processProvider(supabase, provider));
  }

  return { ok: true, providers_checked: results.length, results };
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
    const result = await runScoreAutomation(supabase, { onlyEnabled: true });
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
}
