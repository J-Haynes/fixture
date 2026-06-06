'use client';

import { useMemo, useState } from 'react';
import type { Fixture } from '@/lib/types';
import { toLocalDateKey } from '@/lib/dates';
import { DateGroup } from './DateGroup';

type View = 'upcoming' | 'results';

const UPCOMING_STATUSES = new Set(['scheduled', 'live', 'postponed', 'cancelled']);

interface Props {
  fixtures: Fixture[];
}

export function FixtureFeed({ fixtures }: Props) {
  const [view, setView] = useState<View>('upcoming');

  const grouped = useMemo(() => {
    // Exclude "scheduled" games whose kickoff was more than 10 minutes ago —
    // the sync should have marked them "live" by now. Once live, they pass the
    // UPCOMING_STATUSES filter regardless of this cutoff.
    const syncCutoff = new Date(Date.now() - 10 * 60 * 1000);

    const filtered =
      view === 'upcoming'
        ? fixtures.filter(f =>
            UPCOMING_STATUSES.has(f.status) &&
            new Date(f.scheduledAt) >= syncCutoff
          )
        : [...fixtures.filter(f => f.status === 'finished')].reverse();

    const map = new Map<string, Fixture[]>();
    for (const f of filtered) {
      const key = toLocalDateKey(f.scheduledAt);
      const bucket = map.get(key) ?? [];
      bucket.push(f);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [fixtures, view]);

  return (
    <>
      {/* Scrollable feed — padding-bottom clears the fixed bottom nav */}
      <div className="pb-24 max-w-lg mx-auto w-full px-4 py-5 space-y-7">
        {grouped.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-zinc-500">
              {view === 'upcoming' ? 'No upcoming fixtures' : 'No recent results'}
            </p>
          </div>
        ) : (
          grouped.map(([dateKey, dayFixtures]) => (
            <DateGroup key={dateKey} dateKey={dateKey} fixtures={dayFixtures} />
          ))
        )}
      </div>

      {/* Fixed bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-zinc-900 border-t border-zinc-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex max-w-lg mx-auto">
          {(['upcoming', 'results'] as View[]).map(v => (
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
