-- admin_insights: cache diário do digest gerado por IA pra Command Center
CREATE TABLE public.admin_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global', -- 'global' ou course_id::text
  summary_md text NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  model text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  raw_metrics jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_insights_scope_generated ON public.admin_insights(scope, generated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_insights TO authenticated;
GRANT ALL ON public.admin_insights TO service_role;

ALTER TABLE public.admin_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lê insights"
  ON public.admin_insights FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin gerencia insights"
  ON public.admin_insights FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));