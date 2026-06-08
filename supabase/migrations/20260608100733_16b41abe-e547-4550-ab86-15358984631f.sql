-- ============================================================
-- RPCs blindadas pro inbox de admin (não dependem da RLS de aluno)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_inbox_deliverables()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  module_id uuid,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid,
  feedback text,
  score numeric,
  content jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  module_number int,
  module_title text,
  module_trail_id uuid,
  trail_title text,
  course_id uuid,
  profile_display_name text,
  profile_nickname text,
  profile_is_test boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.user_id,
    d.module_id,
    d.status::text,
    d.submitted_at,
    d.reviewed_at,
    d.reviewer_id,
    d.feedback,
    d.score,
    d.content,
    d.created_at,
    d.updated_at,
    m.number AS module_number,
    m.title AS module_title,
    m.trail_id AS module_trail_id,
    t.title AS trail_title,
    t.course_id,
    p.display_name AS profile_display_name,
    p.nickname AS profile_nickname,
    p.is_test AS profile_is_test
  FROM public.module_deliverables d
  LEFT JOIN public.modules m ON m.id = d.module_id
  LEFT JOIN public.trails t ON t.id = m.trail_id
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  WHERE d.submitted_at IS NOT NULL
     OR (
       d.status = 'rascunho'
       AND d.content IS NOT NULL
       AND jsonb_typeof(d.content) = 'object'
       AND d.content <> '{}'::jsonb
     )
  ORDER BY COALESCE(d.submitted_at, d.updated_at) DESC
  LIMIT 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_inbox_deliverables() TO authenticated;

-- pílulas de um módulo pro renderer
CREATE OR REPLACE FUNCTION public.admin_module_pills(p_module_id uuid)
RETURNS TABLE (
  id uuid,
  module_id uuid,
  order_index int,
  kind text,
  title text,
  body_md text,
  required boolean,
  interaction_schema jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    mp.id,
    mp.module_id,
    mp.order_index,
    mp.kind::text,
    mp.title,
    mp.body_md,
    mp.required,
    mp.interaction_schema
  FROM public.module_pills mp
  WHERE mp.module_id = p_module_id
  ORDER BY mp.order_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_module_pills(uuid) TO authenticated;
