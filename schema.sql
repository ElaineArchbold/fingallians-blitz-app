-- Supabase/Postgres schema (previously SQLite via Turso — see
-- migrate_kv_to_supabase.sql for the one-time migration, which is the
-- authoritative version of this table definition plus RLS/policy setup).
-- Read/written directly from the browser (src/supabaseClient.js) using the
-- anon key — value is jsonb since the app reads/writes plain JS objects,
-- not JSON-encoded text like the old Turso version did.
create table if not exists kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

create policy "anon select kv_store" on kv_store for select to anon using (true);
create policy "anon insert kv_store" on kv_store for insert to anon with check (true);
create policy "anon update kv_store" on kv_store for update to anon using (true) with check (true);
