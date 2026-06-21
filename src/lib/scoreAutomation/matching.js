const ABBREVIATIONS = new Map([
  ['st', 'saint'],
  ['ft', 'fort'],
  ['univ', 'university'],
  ['uni', 'university'],
  ['afc', ''],
  ['efc', ''],
  ['football', ''],
  ['club', ''],
  ['team', ''],
]);

export function normalizeTeamName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(part => ABBREVIATIONS.has(part) ? ABBREVIATIONS.get(part) : part)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function similarity(a, b) {
  const left = normalizeTeamName(a);
  const right = normalizeTeamName(b);

  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.88;

  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size || 1;

  return intersection / union;
}

export function isScorePlausible(homeScore, awayScore) {
  const home = Number(homeScore);
  const away = Number(awayScore);

  return Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= 0 &&
    away >= 0 &&
    home <= 120 &&
    away <= 120;
}

export function getGameKickoff(game) {
  const date = game.kickoff_at || game.kickoffAt || (
    game.date ? `${game.date}T${game.kickoff_time || game.kickoffTime || game.time || '00:00'}` : ''
  );

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameDate(a, b) {
  if (!a || !b) return false;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function getMappedTeamId(mappings, providerKey, externalName, externalId) {
  const normalized = normalizeTeamName(externalName);

  return (mappings || []).find(mapping => {
    if (mapping.provider_key !== providerKey && mapping.providerKey !== providerKey) return false;
    if (externalId && (mapping.external_team_id || mapping.externalTeamId) === externalId) return true;
    return normalizeTeamName(mapping.external_team_name || mapping.externalTeamName) === normalized;
  })?.yardline_team_id || null;
}

export function matchExternalScoreToGame({ externalGame, games, teamMappings = [], gameMappings = [], providerKey }) {
  const mappedGame = gameMappings.find(mapping =>
    (mapping.provider_key || mapping.providerKey) === providerKey &&
    String(mapping.external_game_id || mapping.externalGameId) === String(externalGame.externalGameId)
  );

  if (mappedGame) {
    const game = games.find(item => item.id === (mappedGame.yardline_game_id || mappedGame.yardlineGameId));
    if (game) return { game, confidence: 0.99, reason: 'external_game_mapping', conflict: false };
  }

  const detectedKickoff = externalGame.kickoff ? new Date(externalGame.kickoff) : null;
  const mappedHomeId = getMappedTeamId(teamMappings, providerKey, externalGame.homeTeamName, externalGame.homeTeamId);
  const mappedAwayId = getMappedTeamId(teamMappings, providerKey, externalGame.awayTeamName, externalGame.awayTeamId);

  const candidates = games
    .filter(game => !externalGame.leagueId || !game.league_id || game.league_id === externalGame.leagueId)
    .map(game => {
      const kickoff = getGameKickoff(game);
      const dateScore = detectedKickoff && kickoff && sameDate(detectedKickoff, kickoff) ? 0.2 : 0;
      const homeMapped = mappedHomeId && game.home_team_id === mappedHomeId;
      const awayMapped = mappedAwayId && game.away_team_id === mappedAwayId;
      const reversedMapped = mappedHomeId && mappedAwayId && game.home_team_id === mappedAwayId && game.away_team_id === mappedHomeId;
      const homeNameScore = similarity(externalGame.homeTeamName, game.home_team_name || game.homeTeamName || game.home_team_placeholder || '');
      const awayNameScore = similarity(externalGame.awayTeamName, game.away_team_name || game.awayTeamName || game.away_team_placeholder || '');
      const reversedNameScore = (
        similarity(externalGame.homeTeamName, game.away_team_name || game.awayTeamName || game.away_team_placeholder || '') +
        similarity(externalGame.awayTeamName, game.home_team_name || game.homeTeamName || game.home_team_placeholder || '')
      ) / 2;
      const mappedScore = homeMapped && awayMapped ? 0.65 : 0;
      const nameScore = ((homeNameScore + awayNameScore) / 2) * 0.55;
      const confidence = Math.min(0.98, mappedScore + nameScore + dateScore);

      return {
        game,
        confidence,
        reason: mappedScore ? 'verified_team_mapping' : 'team_name_similarity',
        conflict: Boolean(reversedMapped || reversedNameScore > confidence + 0.08),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  return candidates[0] || { game: null, confidence: 0, reason: 'no_match', conflict: false };
}

export function shouldApplySafeUpdate({ match, externalGame, now = new Date() }) {
  if (!match?.game || match.conflict) return false;
  if (!isScorePlausible(externalGame.homeScore, externalGame.awayScore)) return false;

  const kickoff = getGameKickoff(match.game);
  if (kickoff && kickoff > now) return false;

  if (externalGame.status === 'final') return match.confidence >= 0.96;
  if (externalGame.status === 'live') return match.confidence >= 0.98;

  return false;
}
