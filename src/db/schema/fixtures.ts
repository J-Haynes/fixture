import { pgTable, serial, integer, timestamp, text, jsonb, index } from 'drizzle-orm/pg-core';
import { seasons } from './seasons';
import { teams } from './teams';

export const fixtures = pgTable('fixtures', {
  id:          serial('id').primaryKey(),
  seasonId:    integer('season_id').notNull().references(() => seasons.id),
  homeTeamId:  integer('home_team_id').references(() => teams.id), // nullable: non-team sports (F1, golf)
  awayTeamId:  integer('away_team_id').references(() => teams.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(), // always UTC
  status:      text('status').notNull().default('scheduled'),
  // 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
  round:       text('round'),
  homeScore:   integer('home_score'),
  awayScore:   integer('away_score'),
  sportMeta:   jsonb('sport_meta').$type<Record<string, unknown>>(), // sport-specific overflow
}, table => ({
  // Serves both the page's date-range query and the sync's per-season activity check
  seasonScheduledIdx: index('fixtures_season_scheduled_idx').on(table.seasonId, table.scheduledAt),
  scheduledIdx:       index('fixtures_scheduled_idx').on(table.scheduledAt),
}));
