-- admins podem ler o log de envio de e-mails
CREATE POLICY "Admins can read send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.email_send_log TO authenticated;

-- último login por usuário, exposto só pra admin
CREATE OR REPLACE FUNCTION public.admin_last_sign_in(_user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (user_id uuid, email text, last_sign_in_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text, u.last_sign_in_at
  FROM auth.users u
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND (_user_ids IS NULL OR u.id = ANY(_user_ids));
$$;

REVOKE ALL ON FUNCTION public.admin_last_sign_in(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_last_sign_in(uuid[]) TO authenticated;