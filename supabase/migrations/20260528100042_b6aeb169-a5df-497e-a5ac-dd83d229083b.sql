-- 1) message_redacted em safety_events
ALTER TABLE public.tutor_safety_events
  ADD COLUMN IF NOT EXISTS message_redacted text;

-- 2) tutor_settings: kill switch e ack
ALTER TABLE public.tutor_settings
  ADD COLUMN IF NOT EXISTS tutor_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS acknowledgment_required boolean NOT NULL DEFAULT true;

-- 3) escalations: campos pra fila do admin
ALTER TABLE public.tutor_safety_escalations
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS sla_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','followed_up','closed'));

-- 4) trigger: ao inserir evento severo, chama tutor-safety-notify via pg_net
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_tutor_safety_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text;
  service_key text;
BEGIN
  IF NEW.risk_level NOT IN ('self_harm','abuse') THEN
    RETURN NEW;
  END IF;

  -- só dispara se ainda não tem escalação pra esse evento
  IF EXISTS (SELECT 1 FROM public.tutor_safety_escalations WHERE safety_event_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT current_setting('app.settings.functions_url', true) INTO fn_url;
  IF fn_url IS NULL OR fn_url = '' THEN
    fn_url := 'https://jrzahsjrzaaktuelnsaw.supabase.co/functions/v1';
  END IF;

  PERFORM net.http_post(
    url := fn_url || '/tutor-safety-notify',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('safety_event_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_safety_event ON public.tutor_safety_events;
CREATE TRIGGER trg_notify_safety_event
  AFTER INSERT ON public.tutor_safety_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tutor_safety_event();