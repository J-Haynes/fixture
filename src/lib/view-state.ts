'use client';

// Which tab (and league table) the viewer is on, kept in sessionStorage so a reload
// returns to it while a fresh visit starts on Upcoming. Like preferences, the cached
// server HTML can't know it: the server render and hydration show Upcoming, and the
// stored tab takes over straight after.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fixture:view';

export type View = 'upcoming' | 'results' | 'tables';

export interface ViewState {
  view:       View;
  /** Selected league table; undefined means the first one */
  tableSlug?: string;
}

const VIEWS: readonly View[] = ['upcoming', 'results', 'tables'];
const DEFAULTS: ViewState = { view: 'upcoming' };

let cached: ViewState | null = null;
const listeners = new Set<() => void>();

function read(): ViewState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    if (VIEWS.includes(parsed?.view)) {
      return { view: parsed.view, tableSlug: typeof parsed.tableSlug === 'string' ? parsed.tableSlug : undefined };
    }
  } catch {
    // Storage blocked or corrupt: fall back to defaults
  }
  return DEFAULTS;
}

function getSnapshot(): ViewState {
  return (cached ??= read());
}

function getServerSnapshot(): ViewState {
  return DEFAULTS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(change: Partial<ViewState>) {
  cached = { ...getSnapshot(), ...change };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Storage blocked: the change still applies for this page view
  }
  listeners.forEach(l => l());
}

export function useViewState(): ViewState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setView(view: View) {
  update({ view });
}

export function setTableSlug(tableSlug: string) {
  update({ tableSlug });
}
