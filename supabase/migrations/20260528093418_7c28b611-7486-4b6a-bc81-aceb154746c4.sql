
ALTER TABLE public.tutor_message_events
  ADD COLUMN IF NOT EXISTS ttfb_ms integer,
  ADD COLUMN IF NOT EXISTS helpful_reason text;

ALTER TABLE public.tutor_settings
  ADD COLUMN IF NOT EXISTS fallback_model text DEFAULT 'google/gemini-2.5-flash-lite';

ALTER TABLE public.admin_insights
  ADD COLUMN IF NOT EXISTS retention_until timestamptz NOT NULL DEFAULT (now() + interval '180 days');

CREATE INDEX IF NOT EXISTS admin_insights_retention_idx
  ON public.admin_insights (retention_until);

CREATE OR REPLACE FUNCTION public.cleanup_admin_insights()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.admin_insights WHERE retention_until < now();
$$;
