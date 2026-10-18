'use client';

import type { Fixture } from '@/lib/types';
import { formatDateHeading } from '@/lib/dates';
import { useIsClient } from '@/lib/use-is-client';
import { FixtureCard } from './FixtureCard';

interface Props {
  dateKey: string; // YYYY-MM-DD in local timezone (UTC until hydrated)
  fixtures: Fixture[];
}

export function DateGroup({ dateKey, fixtures }: Props) {
  const isClient = useIsClient();
  const label = formatDateHeading(dateKey, !isClient);
  const isToday = label === 'Today';

  return (
    <section>
      <h2
        className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isToday ? 'text-white' : 'text-zinc-500'}`}
        suppressHydrationWarning
      >
        {label}
      </h2>
      <div className="space-y-3">
        {fixtures.map(fixture => (
          <FixtureCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
