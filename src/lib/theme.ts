'use client';

import { useSyncExternalStore } from 'react';
import { DEFAULT_THEME, STORAGE_KEY, THEME_BACKGROUND, type Theme } from './theme-script';

export { THEMES, type Theme } from './theme-script';

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'blue' || value === 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BACKGROUND[theme]);
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** The viewer's theme; the default during the server render and hydration */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => DEFAULT_THEME);
}

export function setTheme(theme: Theme) {
  try {
    if (theme === DEFAULT_THEME) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the theme still applies until the page is closed
  }
  applyTheme(theme);
  listeners.forEach(l => l());
}
