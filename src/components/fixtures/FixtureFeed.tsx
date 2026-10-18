'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { Fixture, LeagueTable } from '@/lib/types';
import { toLocalDateKey } from '@/lib/dates';
import { subscribeClock, getClock } from '@/lib/clock';
import { usePreferences, showAllLeagues, isFixtureVisible } from '@/lib/preferences';
import { DateGroup } from './DateGroup';
import { LeagueTables } from '@/components/tables/LeagueTables';

type View = 'upcoming' | 'results' | 'tables';

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
  const [view, setView] = useState<View>('upcoming');
  // The page HTML is cached, so hydrate with the render time (matching the server
  // markup) and then switch to the real clock, ticking once a minute.
  const now = useSyncExternalStore(subscribeClock, getClock, () => renderedAt);
  const prefs = usePreferences();
  // The server can't know the viewer's timezone, so the server render and hydration group
  // fixtures by UTC day (a deterministic match); the client then regroups by local day.
  // Grouping by local day straight away changes the markup and breaks hydration.
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
      const key = isClient ? toLocalDateKey(f.scheduledAt) : f.scheduledAt.slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(f);
      map.set(key, bucket);
    }
    return { grouped: Array.from(map.entries()), filteredOut: inView.length - filtered.length };
  }, [fixtures, view, now, prefs, isClient]);

  return (
    <>
      {/* Scrollable feed — padding-bottom clears the fixed bottom nav */}
      <div className="pb-24 max-w-lg mx-auto w-full px-4 py-5">
        {view === 'tables' ? (
          <LeagueTables tables={tables} />
        ) : grouped.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-zinc-500">
              {view === 'upcoming' ? 'No upcoming fixtures' : 'No recent results'}
            </p>
            {filteredOut > 0 && (
              <p className="mt-2 text-sm text-zinc-600">
                Your filters are hiding {filteredOut} {filteredOut === 1 ? 'fixture' : 'fixtures'}. Change them in the menu.
              </p>
            )}
            {prefs.hiddenLeagues.length > 0 && (
              <button
                type="button"
                onClick={showAllLeagues}
                className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                Show all leagues
              </button>
            )}
          </div>
        ) : (
          grouped.map(([dateKey, dayFixtures], i) => (
            <div key={dateKey}>
              {i > 0 && (
                <div className="flex justify-center my-7">
                  <div className="h-px bg-zinc-800 w-4/5" />
                </div>
              )}
              <DateGroup dateKey={dateKey} fixtures={dayFixtures} />
            </div>
          ))
        )}
      </div>

      {/* Fixed bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-zinc-900 border-t border-zinc-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-lg mx-auto">
          {(['upcoming', 'results', 'tables'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-4 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? 'text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
