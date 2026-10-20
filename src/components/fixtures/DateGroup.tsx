'use client';

import type { Fixture } from '@/lib/types';
import { formatDateHeading } from '@/lib/dates';
import { FixtureCard } from './FixtureCard';

interface Props {
  dateKey: string; // YYYY-MM-DD in local timezone
  fixtures: Fixture[];
  /** The last day in the feed has no divider after it */
  isLast: boolean;
}

export function DateGroup({ dateKey, fixtures, isLast }: Props) {
  const { day, date } = formatDateHeading(dateKey);

  return (
    // The divider to the next day sits inside this section, so the sticky heading stays up
    // until the next day's heading reaches it and pushes it out.
    <section aria-label={`${day} ${date}`}>
      <h2
        // Sticks just under the app header (h-14 + its 1px border + the notch)
        className="sticky z-10 -mx-4 mb-1 flex items-baseline gap-2 bg-zinc-950 px-4 pb-3 pt-3"
        style={{ top: 'calc(3.5rem + 1px + env(safe-area-inset-top))' }}
      >
        <span className="text-xl font-bold tracking-tight text-zinc-100">{day}</span>
        <span className="text-base font-medium text-zinc-400">{date}</span>
      </h2>
      <div className="space-y-3">
        {fixtures.map(fixture => (
          <FixtureCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
      {!isLast && (
        <div className="flex justify-center py-7" aria-hidden="true">
          <div className="h-px w-4/5 bg-zinc-800" />
        </div>
      )}
    </section>
  );
}
