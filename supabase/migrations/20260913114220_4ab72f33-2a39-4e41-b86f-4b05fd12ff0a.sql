-- 1) triagem por ia guardada por entrega
CREATE TABLE public.deliverable_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL UNIQUE REFERENCES public.module_deliverables(id) ON DELETE CASCADE,
  verdict text NOT NULL CHECK (verdict IN ('ok','revisar','atencao')),
  summary text NOT NULL DEFAULT '',
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_score numeric,
  score_max numeric,
  model text,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.deliverable_ai_reviews TO authenticated;
GRANT ALL ON public.deliverable_ai_reviews TO service_role;

ALTER TABLE public.deliverable_ai_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins leem triagem"
  ON public.deliverable_ai_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_deliverable_ai_reviews_updated_at
  BEFORE UPDATE ON public.deliverable_ai_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_deliverable_ai_reviews_verdict ON public.deliverable_ai_reviews(verdict);

-- 2) links de projeto lovable extraídos das entregas
CREATE OR REPLACE FUNCTION public.admin_project_links(p_course_id uuid)
RETURNS TABLE (
  deliverable_id uuid,
  user_id uuid,
  module_number integer,
  module_title text,
  url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (d.id, u.url)
    d.id,
    d.user_id,
    m.number,
    m.title,
    u.url,
    d.submitted_at,
    d.reviewed_at,
    d.status::text
  FROM public.module_deliverables d
  JOIN public.modules m ON m.id = d.module_id
  JOIN public.trails t ON t.id = m.trail_id
  CROSS JOIN LATERAL (
    SELECT regexp_replace(x[1], '[).,;:''"\]]+$', '') AS url
    FROM regexp_matches(d.content::text, 'https?://[^"\s\\]+', 'g') AS x
  ) u
  WHERE t.course_id = p_course_id
    AND (u.url ILIKE '%lovable.app%' OR u.url ILIKE '%lovable.dev%')
    AND public.has_role(auth.uid(), 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.admin_project_links(uuid) TO authenticated;

-- 3) revisão em lote
CREATE OR REPLACE FUNCTION public.admin_bulk_review_deliverables(
  p_ids uuid[],
  p_feedback text,
  p_score numeric DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  IF array_length(p_ids, 1) > 300 THEN
    RAISE EXCEPTION 'lote maior que 300 entregas';
  END IF;

  UPDATE public.module_deliverables d
  SET status = 'revisado',
      reviewed_at = now(),
      reviewer_id = auth.uid(),
      feedback = COALESCE(NULLIF(p_feedback, ''), d.feedback),
      score = COALESCE(p_score, d.score)
  WHERE d.id = ANY(p_ids)
    AND d.submitted_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.admin_audit_log (actor_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    'bulk_review_deliverables',
    'module_deliverables',
    NULL,
    jsonb_build_object('count', v_count, 'ids', to_jsonb(p_ids))
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_review_deliverables(uuid[], text, numeric) TO authenticated;