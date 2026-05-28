-- 1. tutor_settings: caps globais + burst
ALTER TABLE public.tutor_settings
  ADD COLUMN IF NOT EXISTS daily_total_cap integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS daily_total_alert_threshold numeric NOT NULL DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS burst_limit_per_minute integer NOT NULL DEFAULT 10;

-- 2. retention_until em tutor_message_events
ALTER TABLE public.tutor_message_events
  ADD COLUMN IF NOT EXISTS retention_until timestamptz NOT NULL DEFAULT (now() + interval '90 days');

CREATE INDEX IF NOT EXISTS tutor_message_events_retention_idx
  ON public.tutor_message_events (retention_until);

-- 3. profiles: consentimento
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_consent_at timestamptz;

-- 4. tutor_safety_events
CREATE TABLE IF NOT EXISTS public.tutor_safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trail_id uuid,
  module_id uuid,
  message_excerpt text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('emotional_distress','bullying','self_harm','abuse','other')),
  risk_score numeric,
  model_used text,
  intervention_shown text,
  acknowledged_at timestamptz,
  reviewed_by_admin_id uuid,
  admin_notes text,
  retention_until timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.tutor_safety_events TO authenticated;
GRANT ALL ON public.tutor_safety_events TO service_role;

ALTER TABLE public.tutor_safety_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin vê safety events"
  ON public.tutor_safety_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin atualiza safety events"
  ON public.tutor_safety_events FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS tutor_safety_events_created_idx
  ON public.tutor_safety_events (created_at DESC);
CREATE INDEX IF NOT EXISTS tutor_safety_events_retention_idx
  ON public.tutor_safety_events (retention_until);

-- 5. tutor_daily_counters
CREATE TABLE IF NOT EXISTS public.tutor_daily_counters (
  date date PRIMARY KEY,
  total_count integer NOT NULL DEFAULT 0,
  last_alert_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.tutor_daily_counters TO service_role;
GRANT SELECT ON public.tutor_daily_counters TO authenticated;

ALTER TABLE public.tutor_daily_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lê counters"
  ON public.tutor_daily_counters FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_tutor_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tutor_message_events WHERE retention_until < now();
  DELETE FROM public.tutor_safety_events WHERE retention_until < now();
  DELETE FROM public.tutor_daily_counters WHERE date < (current_date - interval '60 days');
END;
$$;