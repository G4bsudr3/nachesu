-- Reforça segurança da tabela tutor_conversations
ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_conversations FORCE ROW LEVEL SECURITY;

-- Garante que user_id nunca seja nulo (evita brechas de RLS com auth.uid() IS NULL)
ALTER TABLE public.tutor_conversations ALTER COLUMN user_id SET NOT NULL;

-- Recria policies com checagens mais estritas
DROP POLICY IF EXISTS "admin reads all tutor conversations" ON public.tutor_conversations;
DROP POLICY IF EXISTS "user inserts own tutor conversations" ON public.tutor_conversations;
DROP POLICY IF EXISTS "user reads own tutor conversations" ON public.tutor_conversations;
DROP POLICY IF EXISTS "user updates own tutor conversations" ON public.tutor_conversations;

-- SELECT: dono autenticado lê o próprio
CREATE POLICY "tutor_conversations select own"
ON public.tutor_conversations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- SELECT: admin autenticado lê tudo (via security definer has_role)
CREATE POLICY "tutor_conversations select admin"
ON public.tutor_conversations
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT: dono autenticado insere o próprio
CREATE POLICY "tutor_conversations insert own"
ON public.tutor_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- UPDATE: dono autenticado atualiza o próprio, sem trocar user_id
CREATE POLICY "tutor_conversations update own"
ON public.tutor_conversations
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- DELETE: só admin autenticado (alunos não apagam histórico via cliente)
CREATE POLICY "tutor_conversations delete admin"
ON public.tutor_conversations
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Revoga acesso a anon explicitamente (defesa em profundidade; edge function usa service role)
REVOKE ALL ON public.tutor_conversations FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.tutor_conversations TO authenticated;