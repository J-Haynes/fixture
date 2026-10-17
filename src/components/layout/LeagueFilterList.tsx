'use client';

import { useState } from 'react';
import type { League } from '@/lib/types';
import { leagueBanner } from '@/lib/league-theme';
import { getSportEmoji } from '@/lib/sports';
import { usePreferences, toggleLeague, showAllLeagues } from '@/lib/preferences';

interface Props {
  leagues: League[];
}

/** League on/off toggles for the menu drawer. Each row uses its league's banner colours. */
export function LeagueFilterList({ leagues }: Props) {
  const { hiddenLeagues } = usePreferences();
  const hidden = new Set(hiddenLeagues);
  const [expanded, setExpanded] = useState<string | null>(null);
  const anyHidden = leagues.some(l => hidden.has(l.slug));

  return (
    <section className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Leagues</h2>
        {anyHidden && (
          <button
            type="button"
            onClick={showAllLeagues}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            Show all
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {leagues.map(league => {
          const on = !hidden.has(league.slug);
          const banner = leagueBanner(league.slug);
          const label = league.shortName ?? league.name;
          const isExpanded = expanded === league.slug;
          const panelId = `league-teams-${league.slug}`;

          return (
            <li key={league.slug} className={`overflow-hidden rounded-xl border ${banner.divider}`}>
              <div
                className={`flex items-center gap-1 pl-3 pr-1 ${banner.strip} transition-opacity ${
                  on ? '' : 'opacity-45 grayscale'
                }`}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggleLeague(league.slug)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                    {league.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={league.logoUrl} alt="" className="max-h-8 max-w-8 object-contain" />
                    ) : (
                      <span aria-hidden="true">{getSportEmoji(league.sport?.slug ?? '')}</span>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 line-clamp-2 text-sm font-medium leading-tight ${banner.text}`}>{label}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : league.slug)}
                  aria-label={`${isExpanded ? 'Hide' : 'Show'} ${label} teams`}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${banner.text} hover:bg-white/10`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </div>

              {isExpanded && (
                // Placeholder: per-team filtering is not built yet (#16)
                <div id={panelId} className="bg-zinc-900 px-4 py-3 text-xs text-zinc-500">
                  Team filters coming soon.
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
