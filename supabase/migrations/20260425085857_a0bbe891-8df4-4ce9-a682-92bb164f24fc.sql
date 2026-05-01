CREATE TABLE public.hub_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','user')),
  user_id uuid,
  theme_primary text,
  theme_tags text[] DEFAULT '{}'::text[],
  matches jsonb DEFAULT '[]'::jsonb,
  aggregates jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hub_insights_scope_user_uidx
  ON public.hub_insights (scope, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX hub_insights_user_idx ON public.hub_insights (user_id);

ALTER TABLE public.hub_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê insights"
  ON public.hub_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin gerencia insights"
  ON public.hub_insights FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_hub_insights_updated_at
  BEFORE UPDATE ON public.hub_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();