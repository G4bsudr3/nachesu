drop policy if exists "Public read email-assets known files" on storage.objects;

create policy "Public read email-assets known files"
on storage.objects for select to public
using (
  bucket_id = 'email-assets'
  and name = any (array['nachesu-wordmark.png'])
);