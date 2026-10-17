/**
 * Season admin. The sync rolls seasons over by itself (see sync-fixtures.ts), so
 * this is for checking on it and for manual overrides.
 *
 *   npm run season                          list leagues, current seasons and fixture spans
 *   npm run season -- roll <league> <year>  make <year> the current season (creates it)
 *   npm run season -- deactivate <league>   stop syncing a league (its fixtures stay in the DB)
 *   npm run season -- activate <league>
 */
import { eq, sql } from 'drizzle-orm';
import { db } from './index';
import { leagues, seasons, fixtures } from './schema';
import { setCurrentSeason } from '@/lib/sync/seasons';

async function findLeague(slug: string | undefined) {
  if (!slug) throw new Error('Missing league slug');
  const [league] = await db.select().from(leagues).where(eq(leagues.slug, slug));
  if (!league) throw new Error(`No league with slug "${slug}"`);
  return league;
}

async function list() {
  const rows = await db
    .select({
      league:   leagues.slug,
      active:   leagues.isActive,
      season:   seasons.year,
      current:  seasons.isCurrent,
      fixtures: sql<number>`count(${fixtures.id})`.mapWith(Number),
      open:     sql<number>`count(${fixtures.id}) filter (
        where ${fixtures.status} in ('scheduled', 'live', 'postponed'))`.mapWith(Number),
      first:    sql<string | null>`to_char(min(${fixtures.scheduledAt}), 'YYYY-MM-DD')`,
      last:     sql<string | null>`to_char(max(${fixtures.scheduledAt}), 'YYYY-MM-DD')`,
      synced:   sql<string | null>`to_char(${seasons.lastSyncedAt}, 'YYYY-MM-DD HH24:MI')`,
    })
    .from(seasons)
    .innerJoin(leagues, eq(leagues.id, seasons.leagueId))
    .leftJoin(fixtures, eq(fixtures.seasonId, seasons.id))
    .groupBy(seasons.id, leagues.id)
    .orderBy(leagues.slug, seasons.year);
  console.table(rows);
}

async function main() {
  const [command = 'list', slug, year] = process.argv.slice(2);

  switch (command) {
    case 'list':
      break;
    case 'roll': {
      const league = await findLeague(slug);
      if (!year) throw new Error('Missing season year, e.g. 2027');
      await setCurrentSeason(league.id, year);
      console.log(`✓ ${league.slug}: ${year} is now the current season (the next sync run imports it)`);
      break;
    }
    case 'activate':
    case 'deactivate': {
      const league = await findLeague(slug);
      await db.update(leagues).set({ isActive: command === 'activate' }).where(eq(leagues.id, league.id));
      console.log(`✓ ${league.slug}: ${command}d`);
      break;
    }
    default:
      throw new Error(`Unknown command "${command}"`);
  }

  await list();
  process.exit(0);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
