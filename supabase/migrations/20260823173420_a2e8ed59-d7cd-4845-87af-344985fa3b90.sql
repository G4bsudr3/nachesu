
-- View pública com apenas campos de exibição
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT user_id, nickname, display_name, avatar_url, slug, cidade, status, instagram, linkedin
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO service_role;

-- Restringe leitura completa do profile ao dono e admins
DROP POLICY IF EXISTS "profiles visíveis para usuários autenticados" ON public.profiles;

CREATE POLICY "profile próprio ou admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
