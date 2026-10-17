'use client';

import { useState } from 'react';
import type { League, Team } from '@/lib/types';
import { leagueBanner } from '@/lib/league-theme';
import { getSportEmoji } from '@/lib/sports';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import {
  usePreferences, toggleLeague, showAllLeagues, toggleTeam, setLeagueMode, leagueMode, type LeagueMode,
} from '@/lib/preferences';

interface Props {
  leagues: League[];
}

/**
 * The menu's filters: followed teams (across every competition), then each league,
 * which toggles on tap and expands to choose "all games" vs "my teams only" and to
 * follow its teams.
 */
export function LeagueFilterList({ leagues }: Props) {
  const prefs = usePreferences();
  const hidden = new Set(prefs.hiddenLeagues);
  const followed = new Set(prefs.followedTeams);
  const anyHidden = leagues.some(l => hidden.has(l.slug));
  const [expanded, setExpanded] = useState<string | null>(null);

  // A club in several competitions appears once
  const teamsBySlug = new Map<string, Team>();
  for (const l of leagues) for (const t of l.teams ?? []) teamsBySlug.set(t.slug, t);
  const myTeams = prefs.followedTeams
    .map(slug => teamsBySlug.get(slug))
    .filter((t): t is Team => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <section className="border-b border-zinc-800 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">My teams</h2>
        {myTeams.length === 0 ? (
          <p className="text-sm leading-snug text-zinc-500">
            Open a league below to follow teams. They show up in every competition they play in.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {myTeams.map(team => (
              <li key={team.slug}>
                <button
                  type="button"
                  onClick={() => toggleTeam(team.slug)}
                  aria-label={`Unfollow ${team.name}`}
                  className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 py-1 pl-1 pr-2.5 text-xs font-medium text-zinc-200 hover:border-zinc-600"
                >
                  <TeamAvatar team={team} size="xs" />
                  {team.name}
                  <span aria-hidden="true" className="text-zinc-500">✕</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
            const teams = league.teams ?? [];
            const mode = leagueMode(prefs, league.slug);
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
                    className="flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {league.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={league.logoUrl} alt="" className="max-h-8 max-w-8 object-contain" />
                      ) : (
                        <span aria-hidden="true">{getSportEmoji(league.sport?.slug ?? '')}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`line-clamp-2 text-sm font-medium leading-tight ${banner.text}`}>{label}</span>
                      {teams.length > 0 && mode === 'mine' && (
                        <span className="block text-[11px] leading-tight text-white/60">My teams only</span>
                      )}
                    </span>
                  </button>

                  {teams.length > 0 && (
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
                  )}
                </div>

                {isExpanded && (
                  <div id={panelId} className="space-y-3 bg-zinc-900 p-3">
                    <ModeToggle mode={mode} onChange={m => setLeagueMode(league.slug, m)} label={label} />
                    <ul className="grid grid-cols-1 gap-1">
                      {teams.map(team => {
                        const isFollowed = followed.has(team.slug);
                        return (
                          <li key={team.slug}>
                            <button
                              type="button"
                              aria-pressed={isFollowed}
                              onClick={() => toggleTeam(team.slug)}
                              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-800"
                            >
                              <TeamAvatar team={team} size="xs" />
                              <span className={`min-w-0 flex-1 truncate text-sm ${isFollowed ? 'font-medium text-zinc-100' : 'text-zinc-400'}`}>
                                {team.name}
                              </span>
                              <Star filled={isFollowed} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function ModeToggle({ mode, onChange, label }: { mode: LeagueMode; onChange: (m: LeagueMode) => void; label: string }) {
  const options: { value: LeagueMode; text: string }[] = [
    { value: 'all',  text: 'All games' },
    { value: 'mine', text: 'My teams only' },
  ];
  return (
    <div role="radiogroup" aria-label={`${label} games to show`} className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-800 p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === o.value ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 ${filled ? 'text-emerald-400' : 'text-zinc-600'}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}
