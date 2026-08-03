CREATE TABLE public.user_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  access_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  device_kind text NOT NULL DEFAULT 'desconhecido',
  hits integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, access_date)
);

GRANT SELECT, INSERT, UPDATE ON public.user_access_log TO authenticated;
GRANT ALL ON public.user_access_log TO service_role;

ALTER TABLE public.user_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own access log insert" ON public.user_access_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "own access log update" ON public.user_access_log
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own or admin access log select" ON public.user_access_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_access_log_updated_at
  BEFORE UPDATE ON public.user_access_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_access_log_user_date ON public.user_access_log (user_id, access_date DESC);

-- ping idempotente por dia
CREATE OR REPLACE FUNCTION public.touch_access(_device_kind text DEFAULT 'desconhecido')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.user_access_log (user_id, device_kind)
  VALUES (auth.uid(), COALESCE(NULLIF(_device_kind, ''), 'desconhecido'))
  ON CONFLICT (user_id, access_date) DO UPDATE
    SET last_seen_at = now(),
        hits = public.user_access_log.hits + 1,
        device_kind = EXCLUDED.device_kind;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_access(text) TO authenticated;

-- sessões vivas da autenticação, só pra admin
CREATE OR REPLACE FUNCTION public.admin_access_sessions(_user_id uuid)
RETURNS TABLE (
  session_id uuid,
  started_at timestamptz,
  last_active_at timestamptz,
  user_agent text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT s.id,
         s.created_at,
         COALESCE(s.refreshed_at, s.updated_at, s.created_at),
         s.user_agent,
         (s.not_after IS NULL OR s.not_after > now())
  FROM auth.sessions s
  WHERE s.user_id = _user_id
  ORDER BY s.created_at DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_access_sessions(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_access_sessions(uuid) TO authenticated;