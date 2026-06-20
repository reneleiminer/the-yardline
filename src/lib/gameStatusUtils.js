export const AUTO_LIVE_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const AUTO_LIVE_EARLY_GRACE_MS = 15 * 60 * 1000;

export function getGameDate(game) {
  const rawDate = String(game?.date || "").trim();
  const rawTime = String(game?.time || game?.kickoffTime || "00:00").trim();

  if (rawDate) {
    const [hour = 0, minute = 0] = rawTime.split(":").map(Number);
    let year;
    let month;
    let day;

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      [year, month, day] = rawDate.split("-").map(Number);
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(rawDate)) {
      [day, month, year] = rawDate.split(".").map(Number);
    }

    if (year && month && day) {
      const date = new Date(
        year,
        month - 1,
        day,
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0,
        0,
        0
      );

      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);
    if (!Number.isNaN(kickoff.getTime())) return kickoff;
  }

  return null;
}

export function hasPlayableScore(game) {
  return (
    game?.scoreHome !== undefined &&
    game?.scoreAway !== undefined &&
    game?.scoreHome !== null &&
    game?.scoreAway !== null &&
    game?.scoreHome !== "" &&
    game?.scoreAway !== "" &&
    Number.isFinite(Number(game.scoreHome)) &&
    Number.isFinite(Number(game.scoreAway))
  );
}

export function isWithinAutoLiveWindow(game, now = new Date()) {
  const kickoff = getGameDate(game);
  if (!kickoff) return false;

  const diff = now.getTime() - kickoff.getTime();
  return diff >= -AUTO_LIVE_EARLY_GRACE_MS && diff <= AUTO_LIVE_MAX_AGE_MS;
}

export function shouldAutoSwitchToLive(game, now = new Date()) {
  if (!game) return false;

  const rawStatus = String(game.status || "scheduled").toLowerCase();

  if (["cancelled", "postponed", "halftime", "half_time", "final", "live"].includes(rawStatus)) {
    return false;
  }

  if (!["scheduled", "upcoming", "planned", "open", ""].includes(rawStatus)) return false;

  return isWithinAutoLiveWindow(game, now);
}

export function getEffectiveGameStatus(game, now = new Date()) {
  if (!game) return "scheduled";

  const rawStatus = String(game.status || "scheduled").toLowerCase();

  if (rawStatus === "cancelled") return "cancelled";
  if (rawStatus === "postponed") return "postponed";
  if (rawStatus === "halftime" || rawStatus === "half_time") return "halftime";
  if (rawStatus === "final") return "final";
  if (rawStatus === "live") {
    return isWithinAutoLiveWindow(game, now) ? "live" : "scheduled";
  }

  if (shouldAutoSwitchToLive(game, now)) return "live";

  return rawStatus || "scheduled";
}
