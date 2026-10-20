/** Returns YYYY-MM-DD in the user's local timezone. */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats a kickoff time (e.g. "15:00") in the user's local timezone. */
export function formatKickoffTime(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
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

/** "1st", "2nd", "3rd", "11th", "22nd"… (the UI is English-only) */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/**
 * A day heading for a YYYY-MM-DD key in the user's local timezone, in two parts: the day
 * ("Today", "Tomorrow", "Yesterday", or the weekday, e.g. "Thursday") and its date, which is
 * always shown ("9th October", with the year when it isn't this year). Client-only: the
 * server can't know the viewer's timezone.
 */
export function formatDateHeading(dateKey: string): { day: string; date: string } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const [y, mo, d] = dateKey.split('-').map(Number);
  const local = new Date(y, mo - 1, d);
  const month = new Intl.DateTimeFormat('en', { month: 'long' }).format(local);
  const date = `${ordinal(d)} ${month}${y !== now.getFullYear() ? ` ${y}` : ''}`;

  const day =
    dateKey === toLocalDateKey(now.toISOString())       ? 'Today'
    : dateKey === toLocalDateKey(tomorrow.toISOString())  ? 'Tomorrow'
    : dateKey === toLocalDateKey(yesterday.toISOString()) ? 'Yesterday'
    : new Intl.DateTimeFormat('en', { weekday: 'long' }).format(local);

  return { day, date };
}
