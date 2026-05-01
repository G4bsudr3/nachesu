DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-future-letters-daily'
  ) THEN
    PERFORM cron.unschedule('process-future-letters-daily');
  END IF;
END $$;