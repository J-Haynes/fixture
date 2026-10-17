import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { seasons } from '@/db/schema';

type Conn = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The season after `year`: "2026" → "2027", "2025-2026" → "2026-2027". Null for other formats.
 * `step` skips years for competitions that aren't annual (a World Cup every 4 years: 2027 → 2031).
 */
export function nextSeasonYear(year: string, step = 1): string | null {
  if (/^\d{4}$/.test(year)) return String(Number(year) + step);
  const span = /^(\d{4})-(\d{4})$/.exec(year);
  if (span) return `${Number(span[1]) + step}-${Number(span[2]) + step}`;
  return null;
}

/**
 * Makes `year` the league's one current season, creating the row if needed.
 * The sync picks it up on its next run (last_synced_at is null for a new row).
 */
export function setCurrentSeason(leagueId: number, year: string, conn: Conn = db): Promise<number> {
  return conn.transaction(async tx => {
    const [season] = await tx
      .insert(seasons)
      .values({ leagueId, year, isCurrent: true })
      .onConflictDoUpdate({ target: [seasons.leagueId, seasons.year], set: { isCurrent: true } })
      .returning({ id: seasons.id });

    await tx.update(seasons)
      .set({ isCurrent: false })
      .where(and(eq(seasons.leagueId, leagueId), ne(seasons.id, season.id), eq(seasons.isCurrent, true)));

    return season.id;
  });
}
