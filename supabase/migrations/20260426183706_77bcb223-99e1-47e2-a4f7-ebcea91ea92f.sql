CREATE TABLE IF NOT EXISTS public.future_letter_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.future_letter_sessions(id) ON DELETE CASCADE,
  letter_text text NOT NULL,
  created_by uuid NOT NULL,
  member_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT future_letter_responses_letter_text_len CHECK (length(trim(letter_text)) >= 10),
  CONSTRAINT future_letter_responses_creator_member CHECK (created_by = ANY(member_user_ids))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_future_letter_responses_session_creator
ON public.future_letter_responses(session_id, created_by);

CREATE INDEX IF NOT EXISTS idx_future_letter_responses_session
ON public.future_letter_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_future_letter_responses_members
ON public.future_letter_responses USING gin(member_user_ids);

ALTER TABLE public.future_letter_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin gerencia respostas carta" ON public.future_letter_responses;
CREATE POLICY "admin gerencia respostas carta"
ON public.future_letter_responses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "aluno cria resposta da carta" ON public.future_letter_responses;
CREATE POLICY "aluno cria resposta da carta"
ON public.future_letter_responses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() = ANY(member_user_ids)
);

DROP POLICY IF EXISTS "aluno vê resposta vinculada" ON public.future_letter_responses;
CREATE POLICY "aluno vê resposta vinculada"
ON public.future_letter_responses
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = ANY(member_user_ids)
);

DROP POLICY IF EXISTS "aluno atualiza própria resposta da carta" ON public.future_letter_responses;
CREATE POLICY "aluno atualiza própria resposta da carta"
ON public.future_letter_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND auth.uid() = ANY(member_user_ids)
);

DROP TRIGGER IF EXISTS update_future_letter_responses_updated_at ON public.future_letter_responses;
CREATE TRIGGER update_future_letter_responses_updated_at
BEFORE UPDATE ON public.future_letter_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();