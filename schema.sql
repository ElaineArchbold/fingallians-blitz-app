-- Supabase/Postgres schema (previously SQLite via Turso — see
-- migrate_kv_to_supabase.sql for the one-time migration, which is the
-- authoritative version of this table definition plus RLS setup).
create table if not exists blitz_kv_store (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table blitz_kv_store enable row level security;
