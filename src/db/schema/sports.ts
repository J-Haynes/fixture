import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const sports = pgTable('sports', {
  id:   serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
}).enableRLS();
