alter table public.builder_cards add column if not exists image_url text;
alter table public.builder_cards add column if not exists image_generated_at timestamptz;

insert into storage.buckets (id, name, public)
values ('builder-card-images', 'builder-card-images', true)
on conflict (id) do nothing;

create policy "público lê imagens de cartas"
on storage.objects for select
using (bucket_id = 'builder-card-images');

create policy "admin envia imagens de cartas"
on storage.objects for insert to authenticated
with check (bucket_id = 'builder-card-images' and public.has_role(auth.uid(), 'admin'));

create policy "admin atualiza imagens de cartas"
on storage.objects for update to authenticated
using (bucket_id = 'builder-card-images' and public.has_role(auth.uid(), 'admin'));

create policy "admin remove imagens de cartas"
on storage.objects for delete to authenticated
using (bucket_id = 'builder-card-images' and public.has_role(auth.uid(), 'admin'));