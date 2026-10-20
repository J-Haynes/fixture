'use client';

import { useEffect, useRef, useState } from 'react';
import type { League, Team } from '@/lib/types';
import { leagueColour } from '@/lib/league-theme';
import { getSportEmoji } from '@/lib/sports';
import { TeamAvatar } from '@/components/ui/TeamAvatar';
import {
  usePreferences, toggleLeague, showAllLeagues, toggleTeam, setLeagueMode, leagueMode, hasTeamFilter, type LeagueMode,
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
      <section className="border-b border-line p-4">
        <h2 className="mb-3 text-[15px] font-semibold text-chalk">My teams</h2>
        {myTeams.length === 0 ? (
          <p className="text-sm leading-snug text-mist">
            Open a league below to follow teams. They show up in every competition they play in.
          </p>
        ) : (
          <MyTeamsList teams={myTeams} />
        )}
      </section>

      <section className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-chalk">Leagues</h2>
          {anyHidden && (
            <button
              type="button"
              onClick={showAllLeagues}
              className="text-sm font-medium text-flood hover:text-flood/80"
            >
              Show all
            </button>
          )}
        </div>

        <ul className="space-y-2">
          {leagues.map(league => {
            const on = !hidden.has(league.slug);
            const label = league.shortName ?? league.name;
            // A league of one team's games (All Blacks Tests) has nothing to filter, so no chevron
            const teams = hasTeamFilter(league.slug) ? league.teams ?? [] : [];
            const mode = leagueMode(prefs, league.slug);
            const isExpanded = expanded === league.slug;
            const panelId = `league-teams-${league.slug}`;

            return (
              <li key={league.slug} className="overflow-hidden rounded-xl bg-night">
                <div
                  className={`flex items-center gap-1 pl-3 pr-1 text-white transition-opacity ${
                    on ? '' : 'opacity-45 grayscale'
                  }`}
                  style={{ backgroundColor: leagueColour(league.slug) }}
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
                      <span className="line-clamp-2 text-[15px] font-semibold leading-tight">{label}</span>
                      {teams.length > 0 && mode === 'mine' && (
                        <span className="block text-xs leading-tight text-white/70">My teams only</span>
                      )}
                    </span>
                    <Switch on={on} colour={leagueColour(league.slug)} />
                  </button>

                  {teams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : league.slug)}
                      aria-label={`${isExpanded ? 'Hide' : 'Show'} ${label} teams`}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/85 hover:bg-white/10"
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
                  <div id={panelId} className="space-y-3 p-3">
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
                              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-stand-2"
                            >
                              <TeamAvatar team={team} size="xs" />
                              <span className={`min-w-0 flex-1 truncate text-sm ${isFollowed ? 'font-medium text-chalk' : 'text-mist'}`}>
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

const ROWS_SHOWN = 4;
const CHIP_GAP_PX = 8; // gap-2

/**
 * Followed-team chips, capped at four rows. If they wrap onto a fifth row, half of it
 * stays visible (so it's clear there's more) and a "Show all" button expands the list.
 */
function MyTeamsList({ teams }: { teams: Team[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [layout, setLayout] = useState<{ collapsedHeight: number; overflows: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Rows depend on chip widths and the drawer width, so measure rather than count
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => {
      const rowHeight = (list.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      const rowsHeight = ROWS_SHOWN * rowHeight + (ROWS_SHOWN - 1) * CHIP_GAP_PX;
      setLayout({
        collapsedHeight: rowsHeight + CHIP_GAP_PX + rowHeight / 2,
        overflows:       list.scrollHeight > rowsHeight + 1,
      });
    });
    observer.observe(list);
    return () => observer.disconnect();
  }, [teams.length]);

  const collapsed = layout?.overflows === true && !showAll;

  return (
    <>
      <div className="relative">
        <ul
          ref={listRef}
          id="my-teams-list"
          className="flex flex-wrap gap-2 overflow-hidden"
          style={collapsed ? { maxHeight: layout.collapsedHeight } : undefined}
        >
          {teams.map(team => (
            <li key={team.slug}>
              <button
                type="button"
                onClick={() => toggleTeam(team.slug)}
                aria-label={`Unfollow ${team.name}`}
                className="flex items-center gap-2 rounded-full bg-stand-2 py-1 pl-1 pr-2.5 text-[13px] font-medium text-chalk ring-1 ring-flood/40 hover:ring-flood"
              >
                <TeamAvatar team={team} size="xs" />
                {team.name}
                <span aria-hidden="true" className="text-dim">✕</span>
              </button>
            </li>
          ))}
        </ul>
        {collapsed && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-b from-transparent to-stand" />
        )}
      </div>

      {layout?.overflows && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
          aria-controls="my-teams-list"
          className="mt-2.5 text-sm font-medium text-flood hover:text-flood/80"
        >
          {showAll ? 'Show less' : `Show all ${teams.length} teams`}
        </button>
      )}
    </>
  );
}

function ModeToggle({ mode, onChange, label }: { mode: LeagueMode; onChange: (m: LeagueMode) => void; label: string }) {
  const options: { value: LeagueMode; text: string }[] = [
    { value: 'all',  text: 'All games' },
    { value: 'mine', text: 'My teams only' },
  ];
  return (
    <div role="radiogroup" aria-label={`${label} games to show`} className="grid grid-cols-2 gap-1 rounded-lg bg-stand p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={mode === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md py-1.5 text-[13px] font-medium transition-colors ${
            mode === o.value ? 'bg-stand-2 text-chalk shadow-sm' : 'text-mist hover:text-chalk'
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
      className={`h-4 w-4 shrink-0 ${filled ? 'text-flood' : 'text-dim'}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

/** The on/off look of a league row (the row itself is the switch) */
function Switch({ on, colour }: { on: boolean; colour: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${on ? 'bg-white' : 'bg-white/25'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full transition-[left] motion-reduce:transition-none ${on ? 'left-[18px]' : 'left-0.5 bg-white/80'}`}
        style={on ? { backgroundColor: colour } : undefined}
      />
    </span>
  );
}
