-- 1. tutor_message_events: 1 linha por troca user→tutor
CREATE TABLE public.tutor_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NULL,
  trail_id uuid NOT NULL,
  module_id uuid NULL,
  pill_title text NULL,
  user_chars int NOT NULL DEFAULT 0,
  assistant_chars int NOT NULL DEFAULT 0,
  tokens_estimate int NOT NULL DEFAULT 0,
  latency_ms int NOT NULL DEFAULT 0,
  off_scope boolean NOT NULL DEFAULT false,
  helpful smallint NULL,
  model text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_events_created ON public.tutor_message_events (created_at DESC);
CREATE INDEX idx_tutor_events_trail ON public.tutor_message_events (trail_id, created_at DESC);
CREATE INDEX idx_tutor_events_user ON public.tutor_message_events (user_id, created_at DESC);

GRANT SELECT ON public.tutor_message_events TO authenticated;
GRANT ALL ON public.tutor_message_events TO service_role;

ALTER TABLE public.tutor_message_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lê eventos do tutor"
  ON public.tutor_message_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- estudante pode ver os próprios eventos (necessário pro chip "X/Y hoje")
CREATE POLICY "estudante lê próprios eventos"
  ON public.tutor_message_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- estudante pode atualizar APENAS helpful nos próprios eventos recentes
CREATE POLICY "estudante avalia próprio evento"
  ON public.tutor_message_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND created_at > now() - interval '1 hour')
  WITH CHECK (user_id = auth.uid());


-- 2. tutor_settings: singleton id=1
CREATE TABLE public.tutor_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  per_user_daily_limit int NOT NULL DEFAULT 50,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt_addon text NULL,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tutor_settings TO authenticated;
GRANT ALL ON public.tutor_settings TO service_role;

ALTER TABLE public.tutor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê settings do tutor"
  ON public.tutor_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin atualiza settings do tutor"
  ON public.tutor_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin cria settings do tutor"
  ON public.tutor_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- seed
INSERT INTO public.tutor_settings (id, enabled, per_user_daily_limit, model)
VALUES (1, true, 50, 'google/gemini-2.5-flash')
ON CONFLICT (id) DO NOTHING;