'use client';

// Viewer preferences, kept in localStorage (the page HTML is cached and shared, so
// they can't come from the server). Components read them with usePreferences(),
// which renders the defaults during hydration and the stored values straight after.

import { useSyncExternalStore } from 'react';
import type { Fixture } from './types';

const STORAGE_KEY = 'fixture:prefs';

/** "all" shows every game in a league; "mine" only games involving followed teams */
export type LeagueMode = 'all' | 'mine';

export interface Preferences {
  v: 2;
  /** League slugs the viewer has switched off. Stored as hidden, so new leagues show by default. */
  hiddenLeagues: string[];
  /** Team slugs. Teams are followed across every competition they play in. */
  followedTeams: string[];
  /** Per-league overrides of DEFAULT_MODE */
  leagueModes: Record<string, LeagueMode>;
}

/** Cups and continental competitions are noise unless your team is in them */
const MY_TEAMS_BY_DEFAULT = new Set(['champions-league']);

/** Leagues that are already one team's games, so a team filter would do nothing */
const SINGLE_TEAM_LEAGUES = new Set(['all-blacks-tests']);

/** Whether the menu offers the All games / My teams toggle and team list for a league */
export function hasTeamFilter(slug: string): boolean {
  return !SINGLE_TEAM_LEAGUES.has(slug);
}

const DEFAULTS: Preferences = { v: 2, hiddenLeagues: [], followedTeams: [], leagueModes: {} };

let cached: Preferences | null = null;
const listeners = new Set<() => void>();

function read(): Preferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed?.v === 2) return { ...DEFAULTS, ...parsed };
    if (parsed?.v === 1 && Array.isArray(parsed.hiddenLeagues)) {
      return { ...DEFAULTS, hiddenLeagues: parsed.hiddenLeagues };
    }
  } catch {
    // Storage blocked or corrupt: fall back to defaults
  }
  return DEFAULTS;
}

function getSnapshot(): Preferences {
  return (cached ??= read());
}

function getServerSnapshot(): Preferences {
  return DEFAULTS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function update(change: (prefs: Preferences) => Preferences) {
  cached = change(getSnapshot());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Storage blocked: the change still applies for this page view
  }
  listeners.forEach(l => l());
}

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter(i => i !== item) : [...list, item];

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleLeague(slug: string) {
  update(prefs => ({ ...prefs, hiddenLeagues: toggle(prefs.hiddenLeagues, slug) }));
}

export function showAllLeagues() {
  update(prefs => ({ ...prefs, hiddenLeagues: [] }));
}

export function toggleTeam(slug: string) {
  update(prefs => ({ ...prefs, followedTeams: toggle(prefs.followedTeams, slug) }));
}

export function setLeagueMode(slug: string, mode: LeagueMode) {
  update(prefs => ({ ...prefs, leagueModes: { ...prefs.leagueModes, [slug]: mode } }));
}

export function leagueMode(prefs: Preferences, slug: string): LeagueMode {
  if (!hasTeamFilter(slug)) return 'all';
  return prefs.leagueModes[slug] ?? (MY_TEAMS_BY_DEFAULT.has(slug) ? 'mine' : 'all');
}

/** The one rule for what the feed shows */
export function isFixtureVisible(fixture: Fixture, prefs: Preferences): boolean {
  const slug = fixture.league.slug;
  if (prefs.hiddenLeagues.includes(slug)) return false;
  // Leagues without teams (motorsport) have nothing to narrow by
  if (leagueMode(prefs, slug) === 'all' || (!fixture.homeTeam && !fixture.awayTeam)) return true;
  return [fixture.homeTeam?.slug, fixture.awayTeam?.slug].some(t => t != null && prefs.followedTeams.includes(t));
}
