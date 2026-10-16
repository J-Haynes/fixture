import { pgTable, serial, text, integer, unique } from 'drizzle-orm/pg-core';

// Decouples internal IDs from API provider IDs.
// Swap or add providers without migrating foreign keys everywhere.
export const externalIds = pgTable('external_ids', {
  id:         serial('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'fixture' | 'team' | 'league' | 'venue'
  entityId:   integer('entity_id').notNull(),
  provider:   text('provider').notNull(),    // 'api-sports' | 'sportmonks'
  externalId: text('external_id').notNull(),
}, table => ({
  uniqProviderEntity: unique('external_ids_provider_entity_key')
    .on(table.entityType, table.entityId, table.provider),
  // One internal entity per provider ID — lets the sync upsert mappings by external ID
  uniqProviderExternal: unique('external_ids_provider_external_key')
    .on(table.provider, table.entityType, table.externalId),
}));
