-- tabela de artworks fixos por arquétipo (one per archetype, reaproveitado por todas as cartas)
create table public.archetype_artworks (
  archetype public.builder_archetype primary key,
  image_url text not null,
  prompt_used text,
  model text,
  generated_at timestamptz not null default now()
);

alter table public.archetype_artworks enable row level security;

create policy "todos veem artworks"
  on public.archetype_artworks
  for select
  using (true);

create policy "admin gerencia artworks"
  on public.archetype_artworks
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- bucket público pros artworks
insert into storage.buckets (id, name, public)
values ('archetype-artworks', 'archetype-artworks', true)
on conflict (id) do nothing;

-- storage policies: leitura pública, escrita apenas admin
create policy "artworks publicamente legíveis"
  on storage.objects
  for select
  using (bucket_id = 'archetype-artworks');

create policy "admin escreve artworks"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'archetype-artworks'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  );

create policy "admin atualiza artworks"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'archetype-artworks'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  );

create policy "admin deleta artworks"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'archetype-artworks'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  );