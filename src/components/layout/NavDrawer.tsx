'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const noopSubscribe = () => () => {};

/** Hamburger button plus the slide-out menu drawer it opens. */
export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The drawer is portalled to <body> (the sticky header's stacking context would
  // otherwise put it under the bottom nav), which only exists on the client.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="nav-drawer"
        className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mounted && createPortal(
        <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} inert={!open}>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className={`absolute inset-0 bg-black/60 transition-opacity duration-200 motion-reduce:transition-none ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <aside
            id="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-zinc-900 border-r border-zinc-800 shadow-2xl shadow-black/50 transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'translate-x-0' : '-translate-x-full'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
              <span className="font-semibold text-zinc-100">Menu</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Menu content goes here (leagues, My Teams, …) */}
            <nav className="flex-1 overflow-y-auto" aria-label="Main" />

            <div className="border-t border-zinc-800 p-2">
              {/* Placeholder: no settings page yet */}
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
              </button>
            </div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
