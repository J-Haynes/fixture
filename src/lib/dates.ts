/** Returns YYYY-MM-DD in the user's local timezone. */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns YYYY-MM-DD in UTC (for the server render and hydration). */
function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a kickoff time (e.g. "15:00") in the user's local timezone, or in `timeZone`.
 * Pass 'UTC' for the server render and hydration, which can't know the viewer's timezone.
 */
export function formatKickoffTime(isoString: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(isoString));
}

/** Formats a date in the user's local timezone (e.g. "Sat 17 Oct"). */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/**
 * Returns a human-readable date heading ("Today", "Tomorrow", "Mon 2 Jun") for a
 * YYYY-MM-DD key in the user's local timezone, or in UTC when `utc` is set (server
 * render and hydration, where the keys are UTC days).
 */
export function formatDateHeading(dateKey: string, utc = false): string {
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  if (utc) {
    if (dateKey === toUtcDateKey(now)) return 'Today';
    if (dateKey === toUtcDateKey(new Date(now.getTime() - DAY_MS))) return 'Yesterday';
    if (dateKey === toUtcDateKey(new Date(now.getTime() + DAY_MS))) return 'Tomorrow';
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    if (dateKey === toLocalDateKey(now.toISOString())) return 'Today';
    if (dateKey === toLocalDateKey(yesterday.toISOString())) return 'Yesterday';
    if (dateKey === toLocalDateKey(tomorrow.toISOString())) return 'Tomorrow';
  }

  const [y, mo, d] = dateKey.split('-').map(Number);
  const thisYear = utc ? now.getUTCFullYear() : now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: y !== thisYear ? 'numeric' : undefined,
    timeZone: utc ? 'UTC' : undefined,
  }).format(utc ? new Date(Date.UTC(y, mo - 1, d)) : new Date(y, mo - 1, d));
}
