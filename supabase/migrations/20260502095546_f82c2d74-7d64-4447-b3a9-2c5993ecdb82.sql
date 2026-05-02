-- adiciona prompt do problema central da trilha (usado pelo tutor IA)
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS pbl_prompt text;

-- conversas do aluno com o tutor IA por trilha
CREATE TABLE IF NOT EXISTS public.tutor_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trail_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_user_trail
  ON public.tutor_conversations (user_id, trail_id);

ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;

-- aluno vê e mexe só nas próprias conversas
CREATE POLICY "user reads own tutor conversations"
  ON public.tutor_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own tutor conversations"
  ON public.tutor_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own tutor conversations"
  ON public.tutor_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- admin lê todas (acompanhamento pedagógico)
CREATE POLICY "admin reads all tutor conversations"
  ON public.tutor_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- trigger updated_at
CREATE TRIGGER trg_tutor_conversations_updated_at
  BEFORE UPDATE ON public.tutor_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();