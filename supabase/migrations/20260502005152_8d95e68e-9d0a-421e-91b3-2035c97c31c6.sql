alter table public.module_pills
  add column if not exists published boolean not null default true;

create index if not exists module_pills_module_published_idx
  on public.module_pills (module_id, published, order_index);

-- atualiza policy do aluno: só pílulas publicadas
drop policy if exists "aluno vê pílulas de módulos visíveis" on public.module_pills;

create policy "aluno vê pílulas publicadas de módulos visíveis"
on public.module_pills
for select
to authenticated
using (
  exists (
    select 1 from public.modules m
    where m.id = module_pills.module_id
      and (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or (
          module_pills.published = true
          and m.published = true
          and (m.available_from is null or m.available_from <= now())
        )
      )
  )
);
