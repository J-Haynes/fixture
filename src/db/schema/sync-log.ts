import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const syncLog = pgTable('sync_log', {
  id:              serial('id').primaryKey(),
  provider:        text('provider').notNull(),
  entityType:      text('entity_type').notNull(),
  status:          text('status').notNull(),       // 'success' | 'error'
  recordsUpserted: integer('records_upserted'),
  errorMessage:    text('error_message'),
  ranAt:           timestamp('ran_at', { withTimezone: true }).notNull().defaultNow(),
});
