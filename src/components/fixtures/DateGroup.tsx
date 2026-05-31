import type { Fixture } from '@/lib/types';
import { formatDateHeading } from '@/lib/dates';
import { FixtureCard } from './FixtureCard';

interface Props {
  dateKey: string; // YYYY-MM-DD in local timezone
  fixtures: Fixture[];
}

export function DateGroup({ dateKey, fixtures }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        {formatDateHeading(dateKey)}
      </h2>
      <div className="space-y-3">
        {fixtures.map(fixture => (
          <FixtureCard key={fixture.id} fixture={fixture} />
        ))}
      </div>
    </section>
  );
}
