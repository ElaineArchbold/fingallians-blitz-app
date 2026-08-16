-- Supabase migration: Replace Rathvilly GAA with Thomas Davis GAA
-- Run this once in the Supabase SQL editor to update live kv_store data.
-- Safe to re-run (idempotent — only touches rows that still contain "rathvilly").
--
-- What it does:
--   1. teams   → renames rathvillyA/B → thomasdavisA/B, updates name/town/county/color
--   2. matches → rewrites all team references from rathvillyA/B → thomasdavisA/B
--   3. lunchWindows → swaps "rathvilly" → "thomasdavis" in club lists
--   4. orders  → moves any existing rathvilly food order to thomasdavis key

-- ============================================================
-- 1. TEAMS
-- ============================================================
update kv_store
set value = (
  select jsonb_agg(
    case
      when elem->>'id' = 'rathvillyA' then
        jsonb_build_object(
          'id', 'thomasdavisA',
          'clubId', 'thomasdavis',
          'name', 'Thomas Davis GAA A',
          'town', 'Tallaght',
          'county', 'Dublin',
          'color', '#1C7A3E'
        )
      when elem->>'id' = 'rathvillyB' then
        jsonb_build_object(
          'id', 'thomasdavisB',
          'clubId', 'thomasdavis',
          'name', 'Thomas Davis GAA B',
          'town', 'Tallaght',
          'county', 'Dublin',
          'color', '#1C7A3E'
        )
      else elem
    end
  )
  from jsonb_array_elements(value) as elem
),
updated_at = now()
where key = 'teams'
  and value::text like '%rathvilly%';

-- ============================================================
-- 2. MATCHES
-- ============================================================
update kv_store
set value = (
  select jsonb_agg(
    elem
      -- Replace teamA references
      || case
           when elem->>'teamA' = 'rathvillyA' then '{"teamA":"thomasdavisA"}'::jsonb
           when elem->>'teamA' = 'rathvillyB' then '{"teamA":"thomasdavisB"}'::jsonb
           else '{}'::jsonb
         end
      -- Replace teamB references
      || case
           when elem->>'teamB' = 'rathvillyA' then '{"teamB":"thomasdavisA"}'::jsonb
           when elem->>'teamB' = 'rathvillyB' then '{"teamB":"thomasdavisB"}'::jsonb
           else '{}'::jsonb
         end
  )
  from jsonb_array_elements(value) as elem
),
updated_at = now()
where key = 'matches'
  and value::text like '%rathvilly%';

-- ============================================================
-- 3. LUNCH WINDOWS
-- ============================================================
update kv_store
set value = replace(value::text, '"rathvilly"', '"thomasdavis"')::jsonb,
    updated_at = now()
where key = 'lunchWindows'
  and value::text like '%rathvilly%';

-- ============================================================
-- 4. ORDERS (move any existing order from rathvilly key to thomasdavis)
-- ============================================================
update kv_store
set value = (value - 'rathvilly') || jsonb_build_object('thomasdavis', value->'rathvilly'),
    updated_at = now()
where key = 'orders'
  and value ? 'rathvilly';

-- ============================================================
-- 5. AUDIT LOG — leave historical entries as-is (they're a record of what
--    happened under the old name). No changes needed.
-- ============================================================

-- Done! Verify with:
--   select key, value from kv_store where key in ('teams','matches','lunchWindows','orders');
