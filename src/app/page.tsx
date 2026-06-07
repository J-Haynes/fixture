// Fixture data changes constantly — always render fresh on every request
export const dynamic = 'force-dynamic';

import { getFixtures } from '@/lib/fixtures';
import { AppHeader } from '@/components/layout/AppHeader';
import { FixtureFeed } from '@/components/fixtures/FixtureFeed';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const today = new Date();

  const from = new Date(today);
  from.setDate(from.getDate() - 14); // show last 2 rounds of results

  const to = new Date(today);
  to.setDate(to.getDate() + 14); // show next 2 rounds of fixtures

  const { fixtures: allFixtures } = await getFixtures({ from: isoDate(from), to: isoDate(to) });

  // Strip stale "scheduled" games server-side so the fixture list is stable
  // across SSR and client hydration. Any scheduled game that kicked off more
  // than 10 minutes ago should have been marked "live" by the last sync run.
  const syncCutoff = new Date(Date.now() - 10 * 60 * 1000);
  const fixtures = allFixtures.filter(
    f => f.status !== 'scheduled' || new Date(f.scheduledAt) >= syncCutoff
  );

  return (
    <>
      <AppHeader />
      <main>
        <FixtureFeed fixtures={fixtures} />
      </main>
    </>
  );
}
