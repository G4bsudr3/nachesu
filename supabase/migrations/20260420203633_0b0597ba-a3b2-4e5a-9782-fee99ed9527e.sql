drop policy if exists "Public read email-assets" on storage.objects;

create policy "Public read email-assets known files"
on storage.objects for select
using (
  bucket_id = 'email-assets'
  and name in ('chora-logo-preta.png', 'lagrima.png')
);