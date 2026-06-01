-- RPC pra admin mudar status de profile sem depender de UPDATE direto na tabela profiles.
-- centraliza checagem de role e auditoria do approver.
CREATE OR REPLACE FUNCTION public.admin_set_profile_status(
  _user_id uuid,
  _status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  IF _status NOT IN ('active', 'pending', 'archived') THEN
    RAISE EXCEPTION 'invalid status: %', _status;
  END IF;

  UPDATE public.profiles
  SET
    status = _status,
    approved_at = CASE WHEN _status = 'active' THEN now() ELSE approved_at END,
    approved_by_admin_id = CASE WHEN _status = 'active' THEN auth.uid() ELSE approved_by_admin_id END,
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_status(uuid, text) TO authenticated;