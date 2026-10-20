'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { Fixture, LeagueTable } from '@/lib/types';
import { toLocalDateKey } from '@/lib/dates';
import { subscribeClock, getClock } from '@/lib/clock';
import { usePreferences, showAllLeagues, isFixtureVisible } from '@/lib/preferences';
import { useViewState, setView, setTableSlug, type View } from '@/lib/view-state';
import { DateGroup } from './DateGroup';
import { FeedSkeleton } from './FeedSkeleton';
import { LeagueTables, TableSelector } from '@/components/tables/LeagueTables';

const VIEWS: { value: View; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'results',  label: 'Results'  },
  { value: 'tables',   label: 'Tables'   },
];

const UPCOMING_STATUSES = new Set(['scheduled', 'live', 'postponed', 'cancelled']);

// A scheduled game that kicked off over 10 minutes ago should have been marked live by
// the sync; hide it rather than show a stale kickoff time.
const STALE_SCHEDULED_MS = 10 * 60 * 1000;

const noopSubscribe = () => () => {};

// While a game is (or should be) in play, re-fetch the page data at the sync's cadence.
// router.refresh() requests the ISR-cached route, so this never hits the database.
const LIVE_REFRESH_MS = 2 * 60 * 1000;
// Coming back to a tab or PWA left open: refresh if the data is older than this
const RESUME_REFRESH_MS = 5 * 60 * 1000;

interface Props {
  fixtures: Fixture[];
  /** Standings for the Tables tab (football only) */
  tables:   LeagueTable[];
  /** When the (cached) server render happened — used as "now" during hydration */
  renderedAt: number;
}

export function FixtureFeed({ fixtures, tables, renderedAt }: Props) {
  // Kept in sessionStorage so a reload returns to the same tab and table
  const { view, tableSlug } = useViewState();
  // The page HTML is cached, so hydrate with the render time (matching the server
  // markup) and then switch to the real clock, ticking once a minute.
  const now = useSyncExternalStore(subscribeClock, getClock, () => renderedAt);
  const prefs = usePreferences();
  // The server can't know the viewer's timezone (nor their filters or saved tab), so the
  // server render and hydration show a skeleton, and the feed appears right after with
  // local days and kickoff times. Rendering the feed in UTC first made times visibly jump.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const router = useRouter();

  // Live or past-kickoff fixtures mean the cached data is about to change
  const inPlay = useMemo(
    () => fixtures.some(f => f.status === 'live' || (f.status === 'scheduled' && Date.parse(f.scheduledAt) <= now)),
    [fixtures, now],
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - renderedAt > RESUME_REFRESH_MS) router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    const id = inPlay
      ? setInterval(() => document.visibilityState === 'visible' && router.refresh(), LIVE_REFRESH_MS)
      : undefined;

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [inPlay, renderedAt, router]);

  const { grouped, filteredOut } = useMemo(() => {
    const cutoff = now - STALE_SCHEDULED_MS;
    const current = fixtures.filter(f => f.status !== 'scheduled' || Date.parse(f.scheduledAt) >= cutoff);

    const inView =
      view === 'upcoming'
        ? current.filter(f => UPCOMING_STATUSES.has(f.status))
        : [...current.filter(f => f.status === 'finished')].reverse();
    const filtered = inView.filter(f => isFixtureVisible(f, prefs));

    const map = new Map<string, Fixture[]>();
    for (const f of filtered) {
      const key = toLocalDateKey(f.scheduledAt);
      const bucket = map.get(key) ?? [];
      bucket.push(f);
      map.set(key, bucket);
    }
    return { grouped: Array.from(map.entries()), filteredOut: inView.length - filtered.length };
  }, [fixtures, view, now, prefs]);

  const visibleTables = useMemo(
    () => tables.filter(t => !prefs.hiddenLeagues.includes(t.league.slug)),
    [tables, prefs],
  );
  const selectedTable = visibleTables.find(t => t.league.slug === tableSlug) ?? visibleTables[0];
  const showSelector = view === 'tables' && visibleTables.length > 1;

  return (
    <>
      {/* Scrollable feed — padding-bottom clears the fixed bottom nav (and the table selector above it) */}
      <div className={`${showSelector ? 'pb-40' : 'pb-24'} max-w-lg mx-auto w-full px-4 pt-1`}>
        {!isClient ? (
          <FeedSkeleton />
        ) : view === 'tables' ? (
          <LeagueTables tables={visibleTables} selected={selectedTable} anyTables={tables.length > 0} />
        ) : grouped.length === 0 ? (
          <div className="py-20 text-center">
            <p className="scoreboard text-[34px] font-extrabold text-chalk">
              {view === 'upcoming' ? 'Nothing scheduled' : 'No results yet'}
            </p>
            <p className="mx-auto mt-3 max-w-xs text-[15px] leading-snug text-mist">
              {filteredOut > 0
                ? `Your filters are hiding ${filteredOut} ${filteredOut === 1 ? 'game' : 'games'}. Change them in the menu.`
                : view === 'upcoming'
                  ? 'No games in the next two weeks for the leagues you follow.'
                  : 'No games finished in the last two weeks for the leagues you follow.'}
            </p>
            {prefs.hiddenLeagues.length > 0 && (
              <button
                type="button"
                onClick={showAllLeagues}
                className="mt-5 rounded-full bg-flood px-4 py-2 text-sm font-semibold text-night hover:bg-flood/90"
              >
                Show all leagues
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateKey, dayFixtures]) => (
              <DateGroup key={dateKey} dateKey={dateKey} fixtures={dayFixtures} />
            ))}
          </div>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <nav
        aria-label="Views"
        className="fixed bottom-0 inset-x-0 z-20 border-t border-line bg-stand"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {showSelector && (
          <div className="max-w-lg mx-auto">
            <TableSelector tables={visibleTables} selected={selectedTable?.league.slug} onSelect={setTableSlug} />
          </div>
        )}
        <div className="flex max-w-lg mx-auto">
          {VIEWS.map(({ value, label }) => {
            const current = view === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-current={current ? 'page' : undefined}
                // The gold rule on top marks the current view
                className={`relative flex-1 py-4 text-[15px] font-semibold transition-colors ${
                  current ? 'text-chalk' : 'text-dim hover:text-mist'
                }`}
              >
                {current && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-flood" />}
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
