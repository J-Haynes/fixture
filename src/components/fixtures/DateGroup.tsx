'use client';

import type { Fixture } from '@/lib/types';
import { formatDayHeading } from '@/lib/dates';
import { LeagueBand } from '@/components/ui/LeagueBand';
import { FixtureRow } from './FixtureRow';

interface Props {
  dateKey: string; // YYYY-MM-DD in local timezone
  fixtures: Fixture[];
}

/**
 * One day of the feed: a sticky day heading, then each league's games under its band.
 * Leagues appear in the order of their first game that day (so the next kickoff, or in
 * Results the latest finish, comes first), and games keep their order within a league.
 */
export function DateGroup({ dateKey, fixtures }: Props) {
  const { name, date } = formatDayHeading(dateKey);

  const byLeague = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const games = byLeague.get(f.league.slug) ?? [];
    games.push(f);
    byLeague.set(f.league.slug, games);
  }

  return (
    <section aria-label={`${name}, ${date}`}>
      {/* Sits under the sticky app header (3.5rem + the notch) */}
      <h2
        className="sticky z-10 -mx-4 flex items-baseline gap-2.5 bg-night/95 px-4 pb-2.5 pt-4 backdrop-blur-sm"
        style={{ top: 'calc(3.5rem + 1px + env(safe-area-inset-top))' }}
      >
        <span className="scoreboard text-[34px] font-extrabold text-chalk">{name}</span>
        <span className="text-[15px] text-mist">{date}</span>
      </h2>

      <div className="space-y-4">
        {[...byLeague.values()].map(games => {
          const { league } = games[0];
          // A round shared by the whole block goes on the band; otherwise each row shows its own
          const rounds = new Set(games.map(g => g.round ?? ''));
          const sharedRound = rounds.size === 1 ? games[0].round : undefined;
          return (
            <div key={league.slug} className="overflow-hidden rounded-xl bg-stand">
              <LeagueBand league={league} aside={sharedRound} />
              <ul className="divide-y divide-line">
                {games.map(fixture => (
                  <FixtureRow key={fixture.id} fixture={fixture} showRound={!sharedRound} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
