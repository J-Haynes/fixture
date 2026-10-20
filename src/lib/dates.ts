/** Returns YYYY-MM-DD in the user's local timezone. */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * A kickoff time split for display: the clock time ("6:50", or "18:50" in 24-hour locales)
 * and the day period ("pm"), empty where the locale has none.
 */
export function formatKickoffParts(isoString: string): { time: string; period: string } {
  const parts = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
    .formatToParts(new Date(isoString));
  const period = parts.find(p => p.type === 'dayPeriod')?.value ?? '';
  const time = parts
    .filter(p => p.type === 'hour' || p.type === 'minute' || (p.type === 'literal' && p.value.trim() !== ''))
    .map(p => p.value)
    .join('');
  return { time, period: period.toLowerCase() };
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
 * A day heading for a YYYY-MM-DD key in the user's local timezone, in two parts: the day's
 * name ("Today", "Tomorrow", "Yesterday", or the weekday) and its date ("20 October").
 * Client-only: the server can't know the viewer's timezone.
 */
export function formatDayHeading(dateKey: string): { name: string; date: string } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const [y, mo, d] = dateKey.split('-').map(Number);
  const day = new Date(y, mo - 1, d);
  const date = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: y !== now.getFullYear() ? 'numeric' : undefined,
  }).format(day);

  const name =
    dateKey === toLocalDateKey(now.toISOString())       ? 'Today'
    : dateKey === toLocalDateKey(yesterday.toISOString()) ? 'Yesterday'
    : dateKey === toLocalDateKey(tomorrow.toISOString())  ? 'Tomorrow'
    : new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(day);

  return { name, date };
}
