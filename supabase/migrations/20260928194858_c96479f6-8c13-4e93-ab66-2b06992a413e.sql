DROP POLICY IF EXISTS "auth lê settings" ON public.hub_settings;
CREATE POLICY "estudantes leem flags publicas" ON public.hub_settings
  FOR SELECT TO authenticated
  USING (key LIKE 'eletiva\_%' OR key = 'official_photos_url');

DROP POLICY IF EXISTS "auth lê settings chora bot" ON public.chora_bot_settings;
CREATE POLICY "estudantes leem bot ativo" ON public.chora_bot_settings
  FOR SELECT TO authenticated
  USING (enabled = true);

REVOKE SELECT ON public.chora_bot_settings FROM authenticated, anon;
GRANT SELECT (id, welcome_message, cutoff_at, enabled) ON public.chora_bot_settings TO authenticated;