alter table public.archetype_artwork_versions
  add column if not exists seed text,
  add column if not exists variables jsonb,
  add column if not exists preset text;