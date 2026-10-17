'use client';

// Viewer preferences, kept in localStorage (the page HTML is cached and shared, so
// they can't come from the server). Components read them with usePreferences(),
// which renders the defaults during hydration and the stored values straight after.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fixture:prefs';

export interface Preferences {
  v: 1;
  /** League slugs the viewer has switched off. Stored as hidden, so new leagues show by default. */
  hiddenLeagues: string[];
}

const DEFAULTS: Preferences = { v: 1, hiddenLeagues: [] };

let cached: Preferences | null = null;
const listeners = new Set<() => void>();

function read(): Preferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (parsed?.v === 1 && Array.isArray(parsed.hiddenLeagues)) return parsed;
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

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleLeague(slug: string) {
  update(prefs => ({
    ...prefs,
    hiddenLeagues: prefs.hiddenLeagues.includes(slug)
      ? prefs.hiddenLeagues.filter(s => s !== slug)
      : [...prefs.hiddenLeagues, slug],
  }));
}

export function showAllLeagues() {
  update(prefs => ({ ...prefs, hiddenLeagues: [] }));
}
