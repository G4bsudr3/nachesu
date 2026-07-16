-- SobreAI hardening — SEC-08
-- Recria notify_tutor_safety_event preservando 100% da lógica atual e passando,
-- OPCIONALMENTE, o header `x-safety-secret` quando a configuração de banco
-- `app.settings.safety_notify_secret` estiver definida.
--
-- Não-quebra por construção:
--   * se a config de banco NÃO estiver setada → o header é omitido e o disparo
--     funciona igual a hoje;
--   * a edge function tutor-safety-notify só passa a EXIGIR o segredo quando a
--     env `SAFETY_NOTIFY_SECRET` estiver definida do lado dela.
--
-- Ativação completa (endurece o endpoint interno) — fazer os DOIS passos juntos:
--   1) supabase secrets set SAFETY_NOTIFY_SECRET="<segredo forte>"
--   2) ALTER DATABASE postgres SET app.settings.safety_notify_secret = '<mesmo segredo>';
--      (ou configurar via painel; requer reconexão para valer)

CREATE OR REPLACE FUNCTION public.notify_tutor_safety_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text;
  secret text;
  hdrs jsonb;
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

  hdrs := jsonb_build_object('Content-Type','application/json');

  -- adiciona o segredo compartilhado quando configurado
  secret := current_setting('app.settings.safety_notify_secret', true);
  IF secret IS NOT NULL AND secret <> '' THEN
    hdrs := hdrs || jsonb_build_object('x-safety-secret', secret);
  END IF;

  PERFORM net.http_post(
    url := fn_url || '/tutor-safety-notify',
    headers := hdrs,
    body := jsonb_build_object('safety_event_id', NEW.id)
  );
  RETURN NEW;
END;
$$;
