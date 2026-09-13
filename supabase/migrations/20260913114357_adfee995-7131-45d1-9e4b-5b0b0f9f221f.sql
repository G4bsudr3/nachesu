CREATE OR REPLACE FUNCTION public.admin_triage_candidates(
  p_course_id uuid DEFAULT NULL,
  p_module_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  deliverable_id uuid,
  content jsonb,
  module_number integer,
  module_title text,
  module_objective text,
  deliverable_description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.content, m.number, m.title, m.objective, m.deliverable_description
  FROM public.module_deliverables d
  JOIN public.modules m ON m.id = d.module_id
  JOIN public.trails t ON t.id = m.trail_id
  LEFT JOIN public.deliverable_ai_reviews r ON r.deliverable_id = d.id
  WHERE public.has_role(auth.uid(), 'admin')
    AND d.submitted_at IS NOT NULL
    AND d.reviewed_at IS NULL
    AND r.id IS NULL
    AND (p_course_id IS NULL OR t.course_id = p_course_id)
    AND (p_module_id IS NULL OR d.module_id = p_module_id)
  ORDER BY d.submitted_at ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20)
$$;

GRANT EXECUTE ON FUNCTION public.admin_triage_candidates(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_triage_pending_count(
  p_course_id uuid DEFAULT NULL,
  p_module_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.module_deliverables d
  JOIN public.modules m ON m.id = d.module_id
  JOIN public.trails t ON t.id = m.trail_id
  LEFT JOIN public.deliverable_ai_reviews r ON r.deliverable_id = d.id
  WHERE public.has_role(auth.uid(), 'admin')
    AND d.submitted_at IS NOT NULL
    AND d.reviewed_at IS NULL
    AND r.id IS NULL
    AND (p_course_id IS NULL OR t.course_id = p_course_id)
    AND (p_module_id IS NULL OR d.module_id = p_module_id)
$$;

GRANT EXECUTE ON FUNCTION public.admin_triage_pending_count(uuid, uuid) TO authenticated;