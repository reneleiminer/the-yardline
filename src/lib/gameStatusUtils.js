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

export function getEffectiveGameStatus(game, now = new Date()) {
  if (!game) return "scheduled";

  const rawStatus = String(game.status || "scheduled").toLowerCase();

  if (rawStatus === "cancelled") return "cancelled";
  if (rawStatus === "postponed") return "postponed";
  if (rawStatus === "halftime" || rawStatus === "half_time") return "halftime";
  if (rawStatus === "final") return "final";
  if (rawStatus === "live") return "live";

  const kickoff = getGameDate(game);
  if (kickoff && kickoff.getTime() > now.getTime()) return "scheduled";

  if (kickoff && kickoff.getTime() <= now.getTime()) return "live";

  return rawStatus || "scheduled";
}
