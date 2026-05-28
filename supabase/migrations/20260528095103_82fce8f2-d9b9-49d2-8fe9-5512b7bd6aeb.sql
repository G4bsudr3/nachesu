
-- 1) tutor_message_events: retenção 30d + campos redact
ALTER TABLE public.tutor_message_events
  ALTER COLUMN retention_until SET DEFAULT (now() + interval '30 days');

ALTER TABLE public.tutor_message_events
  ADD COLUMN IF NOT EXISTS message_hash text,
  ADD COLUMN IF NOT EXISTS message_redacted text,
  ADD COLUMN IF NOT EXISTS message_length integer,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS topic_tag text;

CREATE INDEX IF NOT EXISTS idx_tutor_events_topic ON public.tutor_message_events(topic_tag);

-- 2) tutor_settings: burst escalonado + emails de notificação
ALTER TABLE public.tutor_settings
  ALTER COLUMN per_user_daily_limit SET DEFAULT 40,
  ADD COLUMN IF NOT EXISTS burst_soft_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS burst_pause_threshold integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS safety_notify_emails text[] NOT NULL DEFAULT ARRAY[]::text[];

-- baixa o limite de quem já tem 50
UPDATE public.tutor_settings SET per_user_daily_limit = 40 WHERE per_user_daily_limit = 50;

-- 3) nova tabela tutor_safety_escalations
CREATE TABLE IF NOT EXISTS public.tutor_safety_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_event_id uuid NOT NULL REFERENCES public.tutor_safety_events(id) ON DELETE CASCADE,
  notified_emails text[] NOT NULL DEFAULT ARRAY[]::text[],
  notified_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  offline_followup_at timestamptz,
  followup_notes text,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_escalations_open
  ON public.tutor_safety_escalations(notified_at DESC)
  WHERE closed_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.tutor_safety_escalations TO authenticated;
GRANT ALL ON public.tutor_safety_escalations TO service_role;

ALTER TABLE public.tutor_safety_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lê escalations"
  ON public.tutor_safety_escalations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin atualiza escalations"
  ON public.tutor_safety_escalations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_safety_escalations_updated
  BEFORE UPDATE ON public.tutor_safety_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) ajusta cleanup pra limpar escalations antigas fechadas
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
  DELETE FROM public.tutor_safety_escalations
    WHERE closed_at IS NOT NULL AND closed_at < (now() - interval '365 days');
END;
$$;
