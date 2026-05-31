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

  const { fixtures } = await getFixtures({ from: isoDate(from), to: isoDate(to) });

  return (
    <>
      <AppHeader />
      <main>
        <FixtureFeed fixtures={fixtures} />
      </main>
    </>
  );
}
