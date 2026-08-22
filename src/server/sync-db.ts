import type { Pool } from 'pg';

// The whole server-side data model (design doc §4). The server stores only
// ciphertext and opaque HMAC'd keys — it can locate and order records, never
// read them. Applied lazily and idempotently on first query, so there is no
// separate migration step while the schema is this small.
export const SCHEMA_SQL = `
create table if not exists sync_accounts (
  account_id text primary key,
  auth_hash  text not null,
  created_at timestamptz not null default now()
);
create table if not exists sync_records (
  account_id text not null,
  record_key text not null,
  iv         text not null,
  ciphertext text not null,
  updated_at timestamptz not null,
  deleted    boolean not null default false,
  server_seq bigserial,
  primary key (account_id, record_key)
);
create index if not exists sync_records_account_seq
  on sync_records (account_id, server_seq);
create table if not exists sync_rate_limits (
  scope        text primary key,
  window_start timestamptz not null,
  attempts     integer not null
);
create index if not exists sync_rate_limits_window_start
  on sync_rate_limits (window_start);
`;

export interface QueryResult {
  rows: Record<string, unknown>[];
}

let pool: Pool | null = null;
let schemaReady: Promise<unknown> | null = null;

// ponytail: one pooled connection per serverless instance, schema ensured once
// per process. Real migrations only when the schema actually changes shape.
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  if (!pool) {
    const { Pool: PgPool } = await import('pg');
    pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  }
  schemaReady ??= pool.query(SCHEMA_SQL);
  await schemaReady;
  return pool.query(text, params);
}
