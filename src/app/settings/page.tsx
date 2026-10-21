import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemePicker } from '@/components/settings/ThemePicker';

export const metadata: Metadata = {
  title: 'Settings | Fixture',
};

// Static: every setting lives on the device and is read on the client
export default function SettingsPage() {
  return (
    <>
      <header
        className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 px-4"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-14 max-w-lg mx-auto w-full">
          <Link
            href="/"
            aria-label="Back to fixtures"
            className="-ml-2 flex h-10 w-10 items-center justify-center justify-self-start rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-bold text-lg tracking-tight text-zinc-100">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto w-full px-4 py-6">
        <section aria-labelledby="theme-heading">
          <h2 id="theme-heading" className="text-base font-semibold text-zinc-100">Theme</h2>
          <p className="mt-1 mb-4 text-sm text-zinc-400">Saved on this device.</p>
          <ThemePicker />
        </section>
      </main>
    </>
  );
}
