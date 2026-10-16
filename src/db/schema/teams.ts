import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { sports } from './sports';

export const teams = pgTable('teams', {
  id:        serial('id').primaryKey(),
  sportId:   integer('sport_id').notNull().references(() => sports.id),
  name:      text('name').notNull(),
  shortName: text('short_name'),
  slug:      text('slug').notNull().unique(),
  logoUrl:   text('logo_url'),
  country:   text('country'),
}).enableRLS();
