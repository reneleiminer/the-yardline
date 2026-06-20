import { format, isAfter, isBefore, parseISO } from "date-fns";
import { de } from "date-fns/locale";

import { getGameDate, hasVisibleGameStream } from "@/lib/gameStatusUtils";

export const AUTO_NEWS_TYPES = [
  {
    id: "weekend_schedule",
    label: "Weekend Schedule",
    description: "Erstellt eine Liga-Vorschau für die Spiele im gewählten Zeitraum.",
  },
  {
    id: "today_schedule",
    label: "Heute",
    description: "Vorschau auf die heutigen Spiele.",
  },
  {
    id: "stream_guide",
    label: "Stream Guide",
    description: "Spiele mit verfügbarem Stream im Zeitraum.",
  },
  {
    id: "weekend_results",
    label: "Wochenend-Ergebnisse",
    description: "Finale Ergebnisse aus dem gewählten Zeitraum.",
  },
];

const TYPE_LABELS = Object.fromEntries(AUTO_NEWS_TYPES.map((type) => [type.id, type.label]));

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDateInput(date) {
  return format(date, "yyyy-MM-dd");
}

export function getDefaultAutoNewsRange(type = "weekend_schedule", now = new Date()) {
  if (type === "today_schedule") {
    const today = toDateInput(now);
    return { dateFrom: today, dateTo: today };
  }

  const day = now.getDay();
  const fridayOffset = (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + fridayOffset);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  return {
    dateFrom: toDateInput(friday),
    dateTo: toDateInput(sunday),
  };
}

function parseInputDate(value, endOfDay = false) {
  if (!value) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return parsed;
}

function getTeamName(team, fallback = "Offen") {
  return team?.shortName || team?.name || fallback || "Offen";
}

function getLeagueName(league) {
  return league?.name || league?.shortName || "The Yardline";
}

function isFinal(game) {
  return String(game?.status || "").toLowerCase() === "final";
}

function hasScore(game) {
  return game?.scoreHome !== undefined && game?.scoreHome !== null && game?.scoreHome !== "" &&
    game?.scoreAway !== undefined && game?.scoreAway !== null && game?.scoreAway !== "";
}

function getGameLine(game, teamsById) {
  const home = teamsById.get(game.homeTeamId);
  const away = teamsById.get(game.awayTeamId);
  const homeName = getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder);
  const awayName = getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder);
  const kickoff = getGameDate(game);
  const day = kickoff ? format(kickoff, "EEE, dd.MM.", { locale: de }) : "Termin offen";
  const time = kickoff ? format(kickoff, "HH:mm", { locale: de }) : "offen";
  const score = isFinal(game) && hasScore(game) ? ` - ${game.scoreHome}:${game.scoreAway}` : "";

  return `${day} um ${time}: ${homeName} vs. ${awayName}${score}`;
}

export function filterGamesForAutoNews({ type, games, leagueId, dateFrom, dateTo }) {
  const start = parseInputDate(dateFrom);
  const end = parseInputDate(dateTo, true);

  return (games || [])
    .filter((game) => !leagueId || game.leagueId === leagueId)
    .filter((game) => {
      const kickoff = getGameDate(game);
      if (!kickoff) return false;
      if (start && isBefore(kickoff, start)) return false;
      if (end && isAfter(kickoff, end)) return false;
      return true;
    })
    .filter((game) => {
      if (type === "stream_guide") return hasVisibleGameStream(game);
      if (type === "weekend_results") return isFinal(game);
      return !["cancelled"].includes(String(game.status || "").toLowerCase());
    })
    .sort((a, b) => (getGameDate(a)?.getTime() || 0) - (getGameDate(b)?.getTime() || 0));
}

function buildSvgRows(games, teamsById) {
  const rows = games.slice(0, 8).map((game, index) => {
    const kickoff = getGameDate(game);
    const home = teamsById.get(game.homeTeamId);
    const away = teamsById.get(game.awayTeamId);
    const homeName = getTeamName(home, game.homeTeamNameSnapshot || game.homeTeamPlaceholder);
    const awayName = getTeamName(away, game.awayTeamNameSnapshot || game.awayTeamPlaceholder);
    const time = kickoff ? format(kickoff, "dd.MM.  HH:mm", { locale: de }) : "Termin offen";
    const y = 328 + index * 38;

    return `
      <text x="102" y="${y}" fill="#8cbfff" font-size="20" font-weight="900">${escapeXml(time)}</text>
      <text x="318" y="${y}" fill="#ffffff" font-size="24" font-weight="900">${escapeXml(homeName)}</text>
      <text x="640" y="${y}" fill="#ff2338" font-size="18" font-weight="900">VS</text>
      <text x="712" y="${y}" fill="#ffffff" font-size="24" font-weight="900">${escapeXml(awayName)}</text>
    `;
  });

  if (games.length > 8) {
    rows.push(`<text x="102" y="638" fill="#ffffff" font-size="22" font-weight="900">+ ${games.length - 8} weitere Spiele</text>`);
  }

  return rows.join("");
}

export function buildAutoNewsSvg({ type, league, games, teamsById, dateFrom, dateTo }) {
  const leagueName = getLeagueName(league);
  const rangeLabel = dateFrom === dateTo
    ? format(parseISO(dateFrom), "dd.MM.yyyy", { locale: de })
    : `${format(parseISO(dateFrom), "dd.MM.", { locale: de })} - ${format(parseISO(dateTo), "dd.MM.yyyy", { locale: de })}`;
  const title = type === "weekend_results" ? "RESULTS" : type === "stream_guide" ? "STREAM GUIDE" : "SCHEDULE";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#08090d"/>
          <stop offset="0.42" stop-color="#150006"/>
          <stop offset="1" stop-color="#00182f"/>
        </linearGradient>
        <linearGradient id="slash" x1="0" x2="1">
          <stop offset="0" stop-color="#d20a18" stop-opacity="0.85"/>
          <stop offset="1" stop-color="#005bff" stop-opacity="0.7"/>
        </linearGradient>
        <pattern id="yard" width="42" height="42" patternUnits="userSpaceOnUse" patternTransform="skewX(-20)">
          <path d="M 0 0 L 0 42" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)"/>
      <path d="M-80 680 L260 -40 H430 L95 680Z" fill="#d20a18" opacity="0.55"/>
      <path d="M760 690 L1095 -20 H1270 L930 690Z" fill="#005bff" opacity="0.38"/>
      <rect width="1200" height="675" fill="url(#yard)"/>
      <rect x="64" y="58" width="1072" height="558" rx="34" fill="#03050a" opacity="0.66" stroke="#ffffff" stroke-opacity="0.12"/>
      <text x="94" y="122" fill="#ff2338" font-size="22" font-weight="900" letter-spacing="4">AUTO NEWSROOM</text>
      <text x="94" y="194" fill="#ffffff" font-size="72" font-style="italic" font-weight="900">${escapeXml(title)}</text>
      <text x="1000" y="120" fill="#ffffff" font-size="20" font-weight="900" text-anchor="end">${escapeXml(rangeLabel)}</text>
      <text x="94" y="244" fill="#8cbfff" font-size="26" font-weight="900">${escapeXml(leagueName)}</text>
      <rect x="94" y="286" width="1012" height="1" fill="#ffffff" opacity="0.16"/>
      ${buildSvgRows(games, teamsById)}
      <text x="94" y="612" fill="#ffffff" fill-opacity="0.62" font-size="18" font-weight="800">THE YARDLINE - Where Football Lives</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildAutoNewsPreview({ type, leagueId, dateFrom, dateTo, games, leagues, teams }) {
  const leaguesById = new Map((leagues || []).map((league) => [league.id, league]));
  const teamsById = new Map((teams || []).map((team) => [team.id, team]));
  const league = leagueId ? leaguesById.get(leagueId) : null;
  const selectedGames = filterGamesForAutoNews({ type, games, leagueId, dateFrom, dateTo });

  if (selectedGames.length === 0) {
    throw new Error("Keine passenden Spiele für diese Auswahl gefunden.");
  }

  const leagueLabel = league ? getLeagueName(league) : "alle Ligen";
  const rangeLabel = dateFrom === dateTo
    ? format(parseISO(dateFrom), "dd.MM.yyyy", { locale: de })
    : `${format(parseISO(dateFrom), "dd.MM.", { locale: de })} bis ${format(parseISO(dateTo), "dd.MM.yyyy", { locale: de })}`;

  const headlinePrefix = type === "weekend_results"
    ? "Ergebnisse"
    : type === "stream_guide"
      ? "Stream-Guide"
      : "Spielplan";
  const title = `${headlinePrefix}: ${leagueLabel} (${rangeLabel})`;
  const excerpt = `${selectedGames.length} ${selectedGames.length === 1 ? "Spiel" : "Spiele"} im Überblick.`;
  const intro = type === "weekend_results"
    ? `Das sind die finalen Ergebnisse aus ${leagueLabel} vom ${rangeLabel}.`
    : type === "stream_guide"
      ? `Diese Spiele aus ${leagueLabel} sind im Zeitraum ${rangeLabel} mit Stream hinterlegt.`
      : `Das steht in ${leagueLabel} am ${rangeLabel} an.`;

  const content = [
    intro,
    ...selectedGames.map((game) => `- ${getGameLine(game, teamsById)}`),
  ].join("\n");

  return {
    type,
    label: TYPE_LABELS[type] || type,
    title,
    teaser: excerpt,
    text: content,
    imageUrl: buildAutoNewsSvg({ type, league, games: selectedGames, teamsById, dateFrom, dateTo }),
    games: selectedGames,
    metadata: {
      source: "auto_newsroom",
      auto_type: type,
      league_id: leagueId || "",
      date_from: dateFrom,
      date_to: dateTo,
      generated_from_game_ids: selectedGames.map((game) => game.id).filter(Boolean),
    },
  };
}

export function getAutoNewsIdentity({ type, leagueId, dateFrom, dateTo }) {
  return [
    "auto_newsroom",
    type || "weekend_schedule",
    leagueId || "all",
    dateFrom || "",
    dateTo || "",
  ].join(":");
}
