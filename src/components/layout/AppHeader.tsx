import type { League } from '@/lib/types';
import { NavDrawer } from './NavDrawer';
import { HeaderClock } from './HeaderClock';

export function AppHeader({ leagues }: { leagues: League[] }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-line bg-stand px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Equal-width side columns keep the logo centred whatever sits either side */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center h-14 max-w-lg mx-auto w-full">
        <div className="justify-self-start">
          <NavDrawer leagues={leagues} />
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={32} height={32} className="h-7 w-7" />
          <h1 className="text-xl font-extrabold tracking-tight text-chalk [font-stretch:125%]">Fixture</h1>
        </div>
        <div className="justify-self-end">
          <HeaderClock />
        </div>
      </div>
    </header>
  );
}
