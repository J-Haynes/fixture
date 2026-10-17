'use client';

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

          return (
            <li
              key={league.slug}
              className={`flex items-center gap-1 rounded-xl border pl-3 pr-1 ${banner.strip} ${banner.divider} transition-opacity ${
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
                <Switch on={on} />
              </button>

              {/* Placeholder: filtering a league by team is not built yet */}
              <button
                type="button"
                aria-label={`Choose ${label} teams`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${banner.text} hover:bg-white/10`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-zinc-600'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
          on ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </span>
  );
}
