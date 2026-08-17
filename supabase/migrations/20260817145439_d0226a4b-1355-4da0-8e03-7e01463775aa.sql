CREATE TABLE public.client_error_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scope text,
  route text,
  message text NOT NULL,
  stack text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_error_log_created_at ON public.client_error_log (created_at DESC);
CREATE INDEX idx_client_error_log_user ON public.client_error_log (user_id);

GRANT INSERT ON public.client_error_log TO authenticated, anon;
GRANT SELECT ON public.client_error_log TO authenticated;
GRANT ALL ON public.client_error_log TO service_role;

ALTER TABLE public.client_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own error insert" ON public.client_error_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "anon error insert" ON public.client_error_log
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "admin reads errors" ON public.client_error_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));