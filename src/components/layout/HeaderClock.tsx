'use client';

import { useSyncExternalStore } from 'react';
import { subscribeClock, getClock } from '@/lib/clock';
import { formatKickoffParts, formatShortDate } from '@/lib/dates';

/**
 * Today's date and the current time, in the viewer's timezone. The page HTML is
 * cached, so nothing is rendered on the server; the clock appears after hydration.
 */
export function HeaderClock() {
  const now = useSyncExternalStore(subscribeClock, getClock, () => null);

  if (now == null) return <div className="h-8 w-16" aria-hidden="true" />;

  const date = new Date(now);
  const { time, period } = formatKickoffParts(date.toISOString());
  return (
    <time dateTime={date.toISOString()} className="flex flex-col items-end leading-tight tabular-nums">
      <span className="text-chalk">
        <span className="scoreboard text-[19px] font-bold">{time}</span>
        {period && <span className="ml-0.5 text-xs text-mist">{period}</span>}
      </span>
      <span className="text-xs text-mist">{formatShortDate(date)}</span>
    </time>
  );
}
