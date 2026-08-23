
-- 1. segredo interno de cron (nunca exposto ao cliente)
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.job_secrets (
  name text primary key,
  secret text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);
alter table private.job_secrets enable row level security;
revoke all on private.job_secrets from anon, authenticated;
grant all on private.job_secrets to service_role;

insert into private.job_secrets (name) values ('cron') on conflict (name) do nothing;

-- 2. reagenda o job passando o segredo no header (sem anon key)
select cron.unschedule('check-student-evasion-daily');
select cron.schedule(
  'check-student-evasion-daily',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://jrzahsjrzaaktuelnsaw.supabase.co/functions/v1/check-student-evasion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select secret from private.job_secrets where name = 'cron')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 3. listagem de arquivos: cada pessoa só enxerga a própria pasta; admin vê tudo
drop policy if exists "hub-album lista dono ou admin" on storage.objects;
create policy "hub-album lista dono ou admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'hub-album'
  and ((auth.uid())::text = (storage.foldername(name))[1] or has_role(auth.uid(), 'admin'::app_role))
);

drop policy if exists "hub-certificates lista dono ou admin" on storage.objects;
create policy "hub-certificates lista dono ou admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'hub-certificates'
  and ((auth.uid())::text = (storage.foldername(name))[1] or has_role(auth.uid(), 'admin'::app_role))
);

drop policy if exists "hub-project-covers lista dono ou admin" on storage.objects;
create policy "hub-project-covers lista dono ou admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'hub-project-covers'
  and ((auth.uid())::text = (storage.foldername(name))[1] or has_role(auth.uid(), 'admin'::app_role))
);

-- hub-materials é curadoria institucional (sem arquivo pessoal): só admin lista
drop policy if exists "hub-materials lista admin" on storage.objects;
create policy "hub-materials lista admin"
on storage.objects for select to authenticated
using (bucket_id = 'hub-materials' and has_role(auth.uid(), 'admin'::app_role));
