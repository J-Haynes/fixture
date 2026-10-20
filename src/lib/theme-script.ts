// Plain values for the colour themes, importable by the root layout (a server component).
// The hook and setter are in theme.ts.

// The colour theme, chosen in Settings and stored on the device. Each theme re-points
// Tailwind's zinc (and, for light, emerald) colour variables in globals.css, so components
// keep using zinc-* classes and follow the theme without knowing about it.
export type Theme = 'dark' | 'blue' | 'light';

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark',  label: 'Dark'  },
  { value: 'blue',  label: 'Blue'  },
  { value: 'light', label: 'Light' },
];

/** Page background per theme: the browser/PWA chrome colour (meta theme-color) */
export const THEME_BACKGROUND: Record<Theme, string> = {
  dark:  '#09090b',
  blue:  '#111a2b',
  light: '#f4f5f7',
};

export const STORAGE_KEY = 'fixture:theme';
export const DEFAULT_THEME: Theme = 'dark';

/**
 * Runs in <head> before the page paints, so a saved theme shows from the first frame
 * (the page HTML is cached and shared, so the server always renders the default).
 * Keep it in step with applyTheme in theme.ts.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='blue'||t==='light'){document.documentElement.dataset.theme=t;var c=${JSON.stringify(THEME_BACKGROUND)}[t];document.addEventListener('DOMContentLoaded',function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c)})}}catch(e){}`;
