-- Tabela de progresso do tutorial por usuário
CREATE TABLE public.tutorial_progress (
  user_id UUID NOT NULL,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, step_id)
);

ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuário vê próprio progresso tutorial"
ON public.tutorial_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "usuário cria próprio progresso tutorial"
ON public.tutorial_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuário remove próprio progresso tutorial"
ON public.tutorial_progress FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todo progresso tutorial"
ON public.tutorial_progress FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));