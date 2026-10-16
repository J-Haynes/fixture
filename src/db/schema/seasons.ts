import { pgTable, serial, text, integer, boolean, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { leagues } from './leagues';

export const seasons = pgTable('seasons', {
  id:        serial('id').primaryKey(),
  leagueId:  integer('league_id').notNull().references(() => leagues.id),
  year:      text('year').notNull(), // e.g. '2026' or '2025/26'
  startDate: date('start_date'),
  endDate:   date('end_date'),
  isCurrent: boolean('is_current').default(false),
  // Set by the sync after each successful provider fetch; drives the per-league sync cadence
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
}, table => ({
  uniqLeagueYear: unique('seasons_league_year_key').on(table.leagueId, table.year),
})).enableRLS();
