import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';
import { sports } from './sports';

export const leagues = pgTable('leagues', {
  id:        serial('id').primaryKey(),
  sportId:   integer('sport_id').notNull().references(() => sports.id),
  name:      text('name').notNull(),
  shortName: text('short_name'),
  slug:      text('slug').notNull().unique(),
  country:   text('country'),
  logoUrl:   text('logo_url'),
  isActive:  boolean('is_active').default(true),
}).enableRLS();
