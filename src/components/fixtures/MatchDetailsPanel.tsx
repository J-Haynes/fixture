'use client';

import { useEffect, useState } from 'react';
import type { MatchDetails, MatchEvent } from '@/lib/types';

// One request per fixture per page load; the route's response is CDN-cached as well
const requests = new Map<number, Promise<MatchDetails>>();

function load(fixtureId: number): Promise<MatchDetails> {
  let request = requests.get(fixtureId);
  if (!request) {
    request = fetch(`/api/fixtures/${fixtureId}/details`).then(res => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<MatchDetails>;
    });
    // A failure can be retried by opening the panel again
    request.catch(() => requests.delete(fixtureId));
    requests.set(fixtureId, request);
  }
  return request;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; details: MatchDetails };

/** Goals, red cards and stats for a finished football match, loaded when first opened */
export function MatchDetailsPanel({ fixtureId }: { fixtureId: number }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    load(fixtureId).then(
      details => !cancelled && setState({ status: 'ready', details }),
      ()      => !cancelled && setState({ status: 'error' }),
    );
    return () => { cancelled = true; };
  }, [fixtureId]);

  if (state.status === 'loading') {
    return <p className="py-4 text-center text-[13px] text-dim">Loading match details…</p>;
  }
  if (state.status === 'error') {
    return <p className="py-4 text-center text-[13px] text-dim">Couldn&apos;t load match details. Try again shortly.</p>;
  }

  const { events, stats } = state.details;
  if (events.length === 0 && stats.length === 0) {
    return <p className="py-4 text-center text-[13px] text-dim">No details yet. They usually arrive soon after full time.</p>;
  }

  return (
    <div className="space-y-4 py-3">
      {events.length > 0 && (
        <ol className="space-y-1.5" aria-label="Goals and red cards">
          {events.map((e, i) => (
            <li key={i} className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-2 text-[13px]">
              <span className="text-right">{e.side === 'home' && <EventLabel event={e} align="right" />}</span>
              <span className="text-center tabular-nums text-dim">{e.minute}&apos;</span>
              <span>{e.side === 'away' && <EventLabel event={e} align="left" />}</span>
            </li>
          ))}
        </ol>
      )}

      {stats.length > 0 && (
        <dl className="space-y-2.5" aria-label="Match stats">
          {stats.map(s => {
            const total = s.home + s.away;
            const homeShare = total > 0 ? (s.home / total) * 100 : 50;
            const fmt = (n: number) => `${n}${s.percent ? '%' : ''}`;
            return (
              <div key={s.label}>
                <div className="flex items-baseline justify-between text-[13px] tabular-nums">
                  <dd className={s.home >= s.away ? 'font-semibold text-chalk' : 'text-mist'}>{fmt(s.home)}</dd>
                  <dt className="text-dim">{s.label}</dt>
                  <dd className={s.away >= s.home ? 'font-semibold text-chalk' : 'text-mist'}>{fmt(s.away)}</dd>
                </div>
                {/* Neutral shades: more isn't always better (fouls, cards) */}
                <div className="mt-1 flex h-1 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                  <span className={s.home >= s.away ? 'bg-mist' : 'bg-line'} style={{ width: `${homeShare}%` }} />
                  <span className={`flex-1 ${s.away >= s.home ? 'bg-mist' : 'bg-line'}`} />
                </div>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

const EVENT_TAGS: Partial<Record<MatchEvent['kind'], string>> = {
  'penalty':        'pen',
  'own-goal':       'OG',
  'missed-penalty': 'missed pen',
};

function EventLabel({ event, align }: { event: MatchEvent; align: 'left' | 'right' }) {
  const tag = EVENT_TAGS[event.kind];
  const missed = event.kind === 'missed-penalty';
  const icon = event.kind === 'red-card'
    ? <span className="inline-block h-3 w-2 shrink-0 rounded-[1px] bg-red-500" aria-label="Red card" />
    : <span className={`shrink-0 ${missed ? 'opacity-40 grayscale' : ''}`} aria-label={missed ? 'Missed penalty' : 'Goal'}>⚽</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {icon}
      <span className={align === 'right' ? 'text-right' : ''}>
        <span className={missed ? 'text-dim' : 'text-chalk'}>{event.player}</span>
        {tag && <span className="text-dim"> ({tag})</span>}
        {event.assist && <span className="block text-[11px] text-dim">assist {event.assist}</span>}
      </span>
    </span>
  );
}
