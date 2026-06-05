import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Normalizes Base44 microsecond timestamps to valid ISO 8601 (3 decimal places).
 */
const normalize = (ts) => {
  if (!ts) return null;
  return String(ts).replace(/(\.\d{3})\d+(Z|[+-]|$)/, '$1$2');
};

/**
 * Computes a German relative time label from a UTC timestamp string.
 */
export const computeRelativeTime = (timestamp) => {
  const normalized = normalize(timestamp);
  if (!normalized) return '';

  const postTime = new Date(normalized).getTime();
  if (isNaN(postTime)) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - postTime) / 1000));

  if (diffSeconds < 60) return 'gerade eben';

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return minutes === 1 ? 'vor 1 Minute' : `vor ${minutes} Minuten`;

  const hours = Math.floor(diffSeconds / 3600);
  if (hours < 24) return hours === 1 ? 'vor 1 Stunde' : `vor ${hours} Stunden`;

  if (hours < 48) return 'gestern';

  try {
    return format(new Date(normalized), 'd. MMM', { locale: de });
  } catch {
    return '';
  }
};

/**
 * Returns a live-updating relative time string.
 * Updates every 30s (fast enough for minute accuracy).
 */
export default function useRelativeTime(timestamp) {
  const [label, setLabel] = useState(() => computeRelativeTime(timestamp));

  useEffect(() => {
    setLabel(computeRelativeTime(timestamp));

    const interval = setInterval(() => {
      setLabel(computeRelativeTime(timestamp));
    }, 30_000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return label;
}