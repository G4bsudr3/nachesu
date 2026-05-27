ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint,
  ADD COLUMN IF NOT EXISTS quiet_hours_end smallint,
  ADD CONSTRAINT profiles_quiet_hours_range CHECK (
    (quiet_hours_start IS NULL OR (quiet_hours_start BETWEEN 0 AND 23))
    AND (quiet_hours_end IS NULL OR (quiet_hours_end BETWEEN 0 AND 23))
  );