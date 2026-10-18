// Statically rendered and cached (ISR). /api/cron/sync expires the fixtures cache tag
// whenever data changes; the hourly revalidate rolls the ±14-day window forward.
export const revalidate = 3600;

import { getCachedFixtures, getCachedLeagues } from '@/lib/fixtures';
import { getCachedTables } from '@/lib/standings';
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

  const [{ fixtures }, leagues, tables] = await Promise.all([
    getCachedFixtures({ from: isoDate(from), to: isoDate(to) }),
    getCachedLeagues(),
    getCachedTables(),
  ]);

  return (
    <>
      <AppHeader leagues={leagues} />
      <main>
        <FixtureFeed fixtures={fixtures} tables={tables} renderedAt={today.getTime()} />
      </main>
    </>
  );
}
