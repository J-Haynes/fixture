import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set.\n' +
    'Add it to .env.local — see .env.example for the format.\n' +
    'Get the connection string from: Supabase → Settings → Database → Connection string'
  );
}

// `prepare: false` is required for Supabase's PgBouncer / transaction pooler.
// It's a no-op on direct connections, so this config works for both.
// One connection per serverless instance (queries are sequential anyway), released when idle.
const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 20 });
export const db = drizzle(client, { schema });
