select cron.alter_job(
  (select jobid from cron.job where jobname = 'check-student-evasion-daily'),
  command := $cmd$
  select net.http_post(
    url := 'https://jrzahsjrzaaktuelnsaw.supabase.co/functions/v1/check-student-evasion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select secret from public.job_secrets where name = 'cron')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);