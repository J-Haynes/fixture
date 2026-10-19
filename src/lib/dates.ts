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

/**
 * Returns a human-readable date heading ("Today", "Tomorrow", "Mon 2 Jun") for a
 * YYYY-MM-DD key in the user's local timezone. Client-only: the server can't know the
 * viewer's timezone.
 */
export function formatDateHeading(dateKey: string): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (dateKey === toLocalDateKey(now.toISOString())) return 'Today';
  if (dateKey === toLocalDateKey(yesterday.toISOString())) return 'Yesterday';
  if (dateKey === toLocalDateKey(tomorrow.toISOString())) return 'Tomorrow';

  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: y !== now.getFullYear() ? 'numeric' : undefined,
  }).format(new Date(y, mo - 1, d));
}
