'use client';

import { useEffect, useState } from 'react';

type State = 'idle' | 'android' | 'ios' | 'dismissed';

const STORAGE_KEY = 'fixture-install-dismissed';

export function InstallPrompt() {
  const [state, setState] = useState<State>('idle');
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User previously dismissed
    if (localStorage.getItem(STORAGE_KEY)) return;

    // iOS Safari — no beforeinstallprompt, needs manual instruction
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) {
      setState('ios');
      return;
    }

    // Android / Chrome / Edge — capture the deferred prompt
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
      setState('android');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setState('dismissed');
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setState('dismissed');
    else dismiss();
    setPrompt(null);
  };

  if (state === 'idle' || state === 'dismissed') return null;

  return (
    <div
      className="fixed left-4 right-4 z-30 flex items-center gap-3 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 shadow-xl shadow-black/40"
      // Sits just above the bottom nav, accounting for safe-area on notched phones
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      role="banner"
      aria-label="Install app"
    >
      <span className="text-xl shrink-0" aria-hidden="true">🏉</span>

      <p className="flex-1 text-sm text-zinc-200 leading-snug">
        {state === 'ios' ? (
          <>
            Tap{' '}
            <span className="font-medium text-zinc-100">⬆ Share</span>
            {' '}then{' '}
            <span className="font-medium text-zinc-100">&ldquo;Add to Home Screen&rdquo;</span>
          </>
        ) : (
          <>
            Add{' '}
            <span className="font-medium text-zinc-100">Fixture</span>
            {' '}to your home screen
          </>
        )}
      </p>

      {state === 'android' && (
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
        >
          Add
        </button>
      )}

      <button
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
