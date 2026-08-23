drop policy if exists "email-assets admin insert" on storage.objects;
drop policy if exists "email-assets admin update" on storage.objects;
drop policy if exists "email-assets admin delete" on storage.objects;
drop policy if exists "email-assets admin list" on storage.objects;

create policy "email-assets admin insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'));

create policy "email-assets admin update"
on storage.objects for update to authenticated
using (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'));

create policy "email-assets admin delete"
on storage.objects for delete to authenticated
using (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'));

create policy "email-assets admin list"
on storage.objects for select to authenticated
using (bucket_id = 'email-assets' and public.has_role(auth.uid(), 'admin'));

revoke all on public.invited_participants from anon;
grant select, insert, update, delete on public.invited_participants to authenticated;
grant all on public.invited_participants to service_role;

alter table public.invited_participants enable row level security;
alter table public.invited_participants force row level security;