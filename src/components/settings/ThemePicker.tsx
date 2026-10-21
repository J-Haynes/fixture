'use client';

import { THEMES, setTheme, useTheme, type Theme } from '@/lib/theme';

// Each option previews its own theme, so these are fixed colours rather than zinc-* classes
// (which would all show the current theme). Keep in step with globals.css.
const PREVIEW: Record<Theme, { page: string; card: string; line: string; text: string; accent: string }> = {
  dark:  { page: '#09090b', card: '#18181b', line: '#27272a', text: '#f4f4f5', accent: '#34d399' },
  blue:  { page: '#111a2b', card: '#192438', line: '#24314a', text: '#eceff4', accent: '#34d399' },
  light: { page: '#f4f5f7', card: '#ffffff', line: '#e2e4e8', text: '#18191d', accent: '#047857' },
};

export function ThemePicker() {
  const current = useTheme();

  return (
    <div role="radiogroup" aria-labelledby="theme-heading" className="grid grid-cols-3 gap-3">
      {THEMES.map(({ value, label }) => {
        const selected = current === value;
        const p = PREVIEW[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={`overflow-hidden rounded-xl border text-left transition-colors ${
              selected ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {/* A miniature feed: a day heading and a card */}
            <span className="block p-2.5" style={{ backgroundColor: p.page }} aria-hidden="true">
              <span className="mb-2 block h-1.5 w-10 rounded-full" style={{ backgroundColor: p.text }} />
              <span className="block rounded-md border p-2" style={{ backgroundColor: p.card, borderColor: p.line }}>
                <span className="flex items-center justify-between">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.line }} />
                  <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: p.text }} />
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.line }} />
                </span>
                <span className="mx-auto mt-1.5 block h-1 w-6 rounded-full" style={{ backgroundColor: p.accent }} />
              </span>
            </span>
            <span className="flex items-center justify-between bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100">
              {label}
              {selected && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
