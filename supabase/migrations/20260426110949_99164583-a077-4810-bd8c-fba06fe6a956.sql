CREATE TABLE public.hub_event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_day text NOT NULL DEFAULT 'dia-1',
  experiencia text,
  poderia_ser_diferente text,
  algo_que_amou text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_day)
);

ALTER TABLE public.hub_event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user insere próprio feedback"
ON public.hub_event_feedback
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user vê próprio feedback"
ON public.hub_event_feedback
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todos feedbacks"
ON public.hub_event_feedback
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin remove feedback"
ON public.hub_event_feedback
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_hub_event_feedback_day_created ON public.hub_event_feedback (event_day, created_at DESC);