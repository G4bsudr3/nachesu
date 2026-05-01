
-- Helper SECURITY DEFINER pra evitar recursão nas policies
CREATE OR REPLACE FUNCTION public.is_future_letter_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.future_letter_members
    WHERE group_id = _group_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_future_letter_group_open_and_owned(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.future_letter_groups
    WHERE id = _group_id
      AND submitted_at IS NULL
      AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_future_letter_group_open(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.future_letter_groups
    WHERE id = _group_id AND submitted_at IS NULL
  );
$$;

-- future_letter_members: recriar policies sem auto-referência
DROP POLICY IF EXISTS "aluno vê integrantes do seu grupo até selar" ON public.future_letter_members;
DROP POLICY IF EXISTS "aluno adiciona integrantes em grupo aberto" ON public.future_letter_members;

CREATE POLICY "aluno vê integrantes do seu grupo"
ON public.future_letter_members
FOR SELECT
TO authenticated
USING (
  public.is_future_letter_group_member(group_id, auth.uid())
);

CREATE POLICY "aluno adiciona integrantes em grupo aberto"
ON public.future_letter_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_future_letter_group_open_and_owned(group_id, auth.uid())
);

-- future_letter_groups: trocar EXISTS interno pelas funções (não é recursão mas mantém consistência)
DROP POLICY IF EXISTS "aluno vê seu grupo até selar" ON public.future_letter_groups;
DROP POLICY IF EXISTS "aluno edita grupo até selar" ON public.future_letter_groups;

CREATE POLICY "aluno vê seu grupo"
ON public.future_letter_groups
FOR SELECT
TO authenticated
USING (
  public.is_future_letter_group_member(id, auth.uid())
);

CREATE POLICY "aluno edita grupo até selar"
ON public.future_letter_groups
FOR UPDATE
TO authenticated
USING (
  submitted_at IS NULL
  AND public.is_future_letter_group_member(id, auth.uid())
)
WITH CHECK (
  public.is_future_letter_group_member(id, auth.uid())
);
