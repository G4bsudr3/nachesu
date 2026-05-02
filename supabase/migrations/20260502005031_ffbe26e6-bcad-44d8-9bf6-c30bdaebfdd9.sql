-- bucket público pra anexos das pílulas
insert into storage.buckets (id, name, public)
values ('pill-attachments', 'pill-attachments', true)
on conflict (id) do nothing;

-- leitura pública (bucket é público mas reforça policy explícita)
create policy "anexos de pílula são públicos pra leitura"
on storage.objects
for select
using (bucket_id = 'pill-attachments');

-- só admins podem subir
create policy "admins fazem upload de anexos de pílula"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pill-attachments'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- só admins podem atualizar
create policy "admins atualizam anexos de pílula"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'pill-attachments'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- só admins podem remover
create policy "admins removem anexos de pílula"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pill-attachments'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);
