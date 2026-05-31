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
    const filtered =
      view === 'upcoming'
        ? fixtures.filter(f => UPCOMING_STATUSES.has(f.status))
        : [...fixtures.filter(f => f.status === 'finished')].reverse();

    const map = new Map<string, Fixture[]>();
    for (const f of filtered) {
      const key = toLocalDateKey(f.scheduledAt);
      const bucket = map.get(key) ?? [];
      bucket.push(f);
      map.set(key, bucket);
    }
    return Array.from(map.entries()); // already in chronological order (or reversed for results)
  }, [fixtures, view]);

  return (
    <div>
      {/* View toggle */}
      <div className="sticky top-14 z-10 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="flex max-w-lg mx-auto">
          {(['upcoming', 'results'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-lg mx-auto w-full px-4 py-5 space-y-7">
        {grouped.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">
              {view === 'upcoming' ? 'No upcoming fixtures' : 'No recent results'}
            </p>
          </div>
        ) : (
          grouped.map(([dateKey, dayFixtures]) => (
            <DateGroup key={dateKey} dateKey={dateKey} fixtures={dayFixtures} />
          ))
        )}
      </div>
    </div>
  );
}
