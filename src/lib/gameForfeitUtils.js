const GERMANY_KEYS = new Set(["deutschland", "germany", "de", "ger"]);

function normalizeCountry(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}

export function isWithdrawnTeam(team) {
  return team?.withdrawn === true;
}

export function isGermanFootballGame({ game, homeTeam, awayTeam, league }) {
  const values = [
    league?.country,
    game?.country,
    homeTeam?.country,
    awayTeam?.country,
  ].map(normalizeCountry);

  return values.some(value => GERMANY_KEYS.has(value));
}

export function getWithdrawnTeamForfeit({ game, homeTeam, awayTeam, league }) {
  const homeWithdrawn = isWithdrawnTeam(homeTeam);
  const awayWithdrawn = isWithdrawnTeam(awayTeam);

  if (homeWithdrawn === awayWithdrawn) return null;
  if (!isGermanFootballGame({ game, homeTeam, awayTeam, league })) return null;

  const withdrawnSide = homeWithdrawn ? "home" : "away";
  const withdrawnTeam = homeWithdrawn ? homeTeam : awayTeam;
  const awardedTeam = homeWithdrawn ? awayTeam : homeTeam;

  return {
    withdrawnSide,
    withdrawnTeamId: withdrawnTeam?.id || (homeWithdrawn ? game?.homeTeamId : game?.awayTeamId) || "",
    awardedTeamId: awardedTeam?.id || (homeWithdrawn ? game?.awayTeamId : game?.homeTeamId) || "",
    scoreHome: homeWithdrawn ? 0 : 36,
    scoreAway: homeWithdrawn ? 36 : 0,
  };
}

export function applyWithdrawnTeamForfeit(payload, { homeTeam, awayTeam, league }) {
  const forfeit = getWithdrawnTeamForfeit({
    game: payload,
    homeTeam,
    awayTeam,
    league,
  });

  if (!forfeit) return payload;

  return {
    ...payload,
    status: "final",
    scoreHome: forfeit.scoreHome,
    scoreAway: forfeit.scoreAway,
    finalizedAt: payload.finalizedAt || new Date().toISOString(),
    gameValuation: "withdrawn_team_forfeit",
    forfeitReason: "team_withdrawn",
    forfeitCountryRule: "DE_0_36",
    forfeitWithdrawnTeamId: forfeit.withdrawnTeamId,
    forfeitAwardedTeamId: forfeit.awardedTeamId,
    predictionEnabled: false,
  };
}
