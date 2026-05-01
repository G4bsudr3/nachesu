-- histórico de versões dos artworks por arquétipo
create table public.archetype_artwork_versions (
  id uuid primary key default gen_random_uuid(),
  archetype builder_archetype not null,
  image_url text not null,
  prompt_used text,
  model text,
  generated_at timestamptz not null default now(),
  is_current boolean not null default false
);

create index idx_archetype_artwork_versions_archetype_generated
  on public.archetype_artwork_versions (archetype, generated_at desc);

alter table public.archetype_artwork_versions enable row level security;

create policy "todos veem versoes artworks"
  on public.archetype_artwork_versions for select using (true);

create policy "admin gerencia versoes artworks"
  on public.archetype_artwork_versions for all to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

-- backfill: cada artwork atual vira a versão atual no histórico
insert into public.archetype_artwork_versions (archetype, image_url, prompt_used, model, generated_at, is_current)
select archetype, image_url, prompt_used, model, generated_at, true
from public.archetype_artworks;
