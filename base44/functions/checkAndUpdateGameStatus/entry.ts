import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIME_ZONE = 'Europe/Berlin';
const LIVE_WINDOW_HOURS = 8;

function getTimeZoneOffsetMs(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const values = {};

  for (const part of formatter.formatToParts(date)) {
    values[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second || 0),
    0
  );

  return asUtc - date.getTime();
}

function createKickoffDateFromDateAndTime(game) {
  if (!game?.date) return null;

  const time = game.time || game.kickoffTime || '00:00';
  const [year, month, day] = String(game.date).split('-').map(Number);
  const [hour, minute] = String(time).split(':').map(Number);

  if (!year || !month || !day) return null;

  const utcGuess = new Date(Date.UTC(
    year,
    month - 1,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    0,
    0
  ));

  const offset = getTimeZoneOffsetMs(utcGuess, TIME_ZONE);
  const kickoff = new Date(utcGuess.getTime() - offset);

  if (Number.isNaN(kickoff.getTime())) return null;

  return kickoff;
}

function getKickoffDate(game) {
  // Hauptsystem: date + time als deutsche Kickoff-Zeit.
  const fromDateAndTime = createKickoffDateFromDateAndTime(game);

  if (fromDateAndTime) {
    return fromDateAndTime;
  }

  // Backup: kickoffAt nur verwenden, wenn date + time fehlt/kaputt ist.
  if (game?.kickoffAt) {
    const kickoff = new Date(game.kickoffAt);

    if (!Number.isNaN(kickoff.getTime())) {
      return kickoff;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const nowTime = now.getTime();
    const liveWindowMs = LIVE_WINDOW_HOURS * 60 * 60 * 1000;

    const games = await base44.asServiceRole.entities.Game.list('-date', 1000);
    const scheduledGames = games.filter((game) => game.status === 'scheduled');

    const updated = [];
    const repaired = [];
    const skipped = [];
    const tooOld = [];
    const upcoming = [];

    for (const game of scheduledGames) {
      const kickoffDate = getKickoffDate(game);

      if (!kickoffDate) {
        skipped.push({
          id: game.id,
          reason: 'no_valid_date_time',
          date: game.date || '',
          time: game.time || '',
          kickoffTime: game.kickoffTime || '',
          kickoffAt: game.kickoffAt || '',
        });
        continue;
      }

      const kickoffTime = kickoffDate.getTime();
      const shouldBeLive = nowTime >= kickoffTime;
      const isTooOldForAutoLive = nowTime - kickoffTime > liveWindowMs;

      if (!shouldBeLive) {
        upcoming.push({
          id: game.id,
          date: game.date || '',
          time: game.time || '',
          kickoffTime: game.kickoffTime || '',
          resolvedKickoffAt: kickoffDate.toISOString(),
          diffMinutes: Math.round((kickoffTime - nowTime) / 60000),
        });
        continue;
      }

      // Schutz: sehr alte scheduled Spiele nicht Tage später versehentlich live setzen.
      // Bei aktuellen Spielen greift Live innerhalb von 8 Stunden ab Kickoff.
      if (isTooOldForAutoLive) {
        tooOld.push({
          id: game.id,
          date: game.date || '',
          time: game.time || '',
          kickoffTime: game.kickoffTime || '',
          resolvedKickoffAt: kickoffDate.toISOString(),
          ageMinutes: Math.round((nowTime - kickoffTime) / 60000),
        });
        continue;
      }

      const payload = {
        status: 'live',
        liveStartedAt: game.liveStartedAt || now.toISOString(),
      };

      // kickoffAt nur nachtragen, wenn es fehlt. Entscheidend bleibt date + time.
      if (!game.kickoffAt) {
        payload.kickoffAt = kickoffDate.toISOString();
        repaired.push(game.id);
      }

      await base44.asServiceRole.entities.Game.update(game.id, payload);
      updated.push(game.id);
    }

    return Response.json({
      success: true,
      timezone: TIME_ZONE,
      now: now.toISOString(),
      checked: scheduledGames.length,
      updated: updated.length,
      repaired: repaired.length,
      skipped: skipped.length,
      tooOld: tooOld.length,
      upcoming: upcoming.slice(0, 20),
      gameIds: updated,
      repairedIds: repaired,
      skippedGames: skipped,
      tooOldGames: tooOld.slice(0, 20),
    });
  } catch (error) {
    console.error('[AUTO-LIVE] Error:', error);

    return Response.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
});
