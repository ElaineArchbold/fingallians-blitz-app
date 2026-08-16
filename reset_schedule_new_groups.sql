-- Supabase SQL: Reset schedule for new group structure
-- New Group 1: Fingallians, Naomh Eoin, Thomas Davis, Knockbridge
-- New Group 2: St. Finian's, Navan O'Mahony's, Ratoath, Bray Emmets
--
-- Run this in the Supabase SQL editor, then open the app as admin (PIN 1001)
-- and click "Generate schedule" to produce the new fixtures with correct groups.
-- The app's generator uses the new DEFAULT_CLUBS ordering to determine groups.

-- 1. Clear existing matches (forces regeneration)
update kv_store
set value = '[]'::jsonb,
    updated_at = now()
where key = 'matches';

-- 2. Clear lunch windows (regenerated with the schedule)
update kv_store
set value = '[]'::jsonb,
    updated_at = now()
where key = 'lunchWindows';

-- 3. Clear presentations timing (regenerated with the schedule)
delete from kv_store where key = 'presentations';

-- 4. Update teams to match new club ordering
-- (ensures the teams array reflects the new group order)
update kv_store
set value = '[
  {"id":"fingA","clubId":"fing","name":"Fingallians GAA A","town":"Swords","county":"Dublin","color":"#B3202E"},
  {"id":"fingB","clubId":"fing","name":"Fingallians GAA B","town":"Swords","county":"Dublin","color":"#B3202E"},
  {"id":"naomheoinA","clubId":"naomheoin","name":"Naomh Eoin CLG / St. John''s GAA A","town":"Belfast","county":"Antrim","color":"#1D4E89"},
  {"id":"naomheoinB","clubId":"naomheoin","name":"Naomh Eoin CLG / St. John''s GAA B","town":"Belfast","county":"Antrim","color":"#1D4E89"},
  {"id":"thomasdavisA","clubId":"thomasdavis","name":"Thomas Davis GAA A","town":"Tallaght","county":"Dublin","color":"#1C7A3E"},
  {"id":"thomasdavisB","clubId":"thomasdavis","name":"Thomas Davis GAA B","town":"Tallaght","county":"Dublin","color":"#1C7A3E"},
  {"id":"knockbridgeA","clubId":"knockbridge","name":"Knockbridge Hurling Club A","town":"Knockbridge","county":"Louth","color":"#1C1C1C"},
  {"id":"knockbridgeB","clubId":"knockbridge","name":"Knockbridge Hurling Club B","town":"Knockbridge","county":"Louth","color":"#1C1C1C"},
  {"id":"finianA","clubId":"finian","name":"St. Finian''s GAA, Swords A","town":"Swords","county":"Dublin","color":"#7A1F2B"},
  {"id":"finianB","clubId":"finian","name":"St. Finian''s GAA, Swords B","town":"Swords","county":"Dublin","color":"#7A1F2B"},
  {"id":"navanomA","clubId":"navanom","name":"Navan O''Mahony''s A","town":"Navan","county":"Meath","color":"#8C1A2B"},
  {"id":"navanomB","clubId":"navanom","name":"Navan O''Mahony''s B","town":"Navan","county":"Meath","color":"#8C1A2B"},
  {"id":"ratoathA","clubId":"ratoath","name":"Ratoath GAA A","town":"Ratoath","county":"Meath","color":"#1C5FA8"},
  {"id":"ratoathB","clubId":"ratoath","name":"Ratoath GAA B","town":"Ratoath","county":"Meath","color":"#1C5FA8"},
  {"id":"brayemmetsA","clubId":"brayemmets","name":"Bray Emmets GAA A","town":"Bray","county":"Wicklow","color":"#2F8F3E"},
  {"id":"brayemmetsB","clubId":"brayemmets","name":"Bray Emmets GAA B","town":"Bray","county":"Wicklow","color":"#2F8F3E"}
]'::jsonb,
    updated_at = now()
where key = 'teams';

-- 5. Update sponsors
update kv_store
set value = '[
  {"id":"s1","name":"Image Fitness","url":"https://www.imageft.ie/","logo":"/image-fitness.jfif"},
  {"id":"s2","name":"Fusion Insurance","url":"https://fusioninsurance.ie/","logo":"/fusioninsurancelogo.jpeg"}
]'::jsonb,
    updated_at = now()
where key = 'sponsors';

-- If sponsors row doesn't exist yet, insert it:
insert into kv_store (key, value, updated_at)
values (
  'sponsors',
  '[{"id":"s1","name":"Image Fitness","url":"https://www.imageft.ie/","logo":"/Image Fitness.jfif"},{"id":"s2","name":"Fusion Insurance","url":"https://fusioninsurance.ie/","logo":"/fusion-insurance-logo-Monogram-on-blue-02-uai-2064x2064.png"}]'::jsonb,
  now()
)
on conflict (key) do nothing;

-- Done! Now log in as admin in the app and click "Generate schedule" to
-- produce the full 24-match + 4-final fixture list with the new groups.
