
create table if not exists public.job_secrets (
  name text primary key,
  secret text not null default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now()
);
revoke all on public.job_secrets from anon, authenticated;
grant all on public.job_secrets to service_role;
alter table public.job_secrets enable row level security;
drop policy if exists "job_secrets service only" on public.job_secrets;
create policy "job_secrets service only" on public.job_secrets for all to service_role using (true) with check (true);

insert into public.job_secrets (name, secret)
select 'cron', secret from private.job_secrets where name = 'cron'
on conflict (name) do nothing;

drop table if exists private.job_secrets;

select cron.unschedule('check-student-evasion-daily');
select cron.schedule(
  'check-student-evasion-daily',
  '0 13 * * *',
  $$
  select net.http_post(
    url := 'https://jrzahsjrzaaktuelnsaw.supabase.co/functions/v1/check-student-evasion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select secret from public.job_secrets where name = 'cron')
    ),
    body := '{}'::jsonb
  );
  $$
);
