/** Returns YYYY-MM-DD in the user's local timezone. */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats a kickoff time in the user's local timezone (e.g. "15:00"). */
export function formatKickoffTime(isoString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/** Returns a human-readable date heading ("Today", "Tomorrow", "Mon 2 Jun"). */
export function formatDateHeading(localDateKey: string): string {
  const now = new Date();
  const todayKey = toLocalDateKey(now.toISOString());

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (localDateKey === todayKey) return 'Today';
  if (localDateKey === toLocalDateKey(yesterday.toISOString())) return 'Yesterday';
  if (localDateKey === toLocalDateKey(tomorrow.toISOString())) return 'Tomorrow';

  const [y, mo, d] = localDateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: y !== now.getFullYear() ? 'numeric' : undefined,
  }).format(new Date(y, mo - 1, d));
}
