import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * THE single post time display function.
 * 
 * Uses pure millisecond diff — NO timezone conversion for relative times.
 * Input: ISO UTC string (post.publishedAtUtc)
 * Output: German relative time string
 */
export const getPostTimeLabel = (publishedAtUtc) => {
  if (!publishedAtUtc) return '';

  const normalized = String(publishedAtUtc).replace(/(\.\d{3})\d+(Z|[+-]|$)/, '$1$2');
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
 * Normalize a timestamp string to valid ISO 8601.
 * Base44's created_date uses microseconds (6 decimal places) which some
 * browsers reject. We trim to 3 decimal places (milliseconds).
 */
const normalizeTimestamp = (ts) => {
  if (!ts) return null;
  // Replace 6-digit microseconds with 3-digit milliseconds: .547000 → .547
  return ts.replace(/(\.\d{3})\d+(Z|[+-]|$)/, '$1$2');
};

/**
 * Get the canonical post timestamp.
 * ONLY uses publishedAtUtc — no fallbacks.
 */
export const getPostTimestamp = (post) => {
  return normalizeTimestamp(post?.publishedAtUtc || null);
};

/**
 * Format a full date+time string (for detail views, comments, etc.)
 */
export const formatFullDateTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    return format(new Date(timestamp), 'd. MMM yyyy HH:mm', { locale: de });
  } catch {
    return '';
  }
};

// Legacy aliases — kept for any remaining imports
export const formatRelativeTime = (ts) => getPostTimeLabel(ts);
export const formatPostTimestamp = (ts) => getPostTimeLabel(ts);
export const formatRelativeTimeWithTime = (ts) => formatFullDateTime(ts);
export const formatPostTimestampWithTime = (ts) => formatFullDateTime(ts);
export const getRelativeTime = (ts) => getPostTimeLabel(ts);