
CREATE OR REPLACE FUNCTION public.scope_check_course(_course_id uuid)
RETURNS TABLE (
  module_id uuid,
  module_number int,
  module_title text,
  pill_id uuid,
  pill_title text,
  pill_kind text,
  term text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug text;
  _terms text[];
  _term text;
BEGIN
  SELECT slug INTO _slug FROM courses WHERE id = _course_id;
  IF _slug IS NULL THEN RETURN; END IF;
  _terms := public.scope_forbidden_terms(_slug);
  IF array_length(_terms, 1) IS NULL THEN RETURN; END IF;

  FOREACH _term IN ARRAY _terms LOOP
    RETURN QUERY
    SELECT m.id, m.number, m.title, p.id, p.title, p.kind::text, _term
    FROM modules m
    JOIN trails t ON t.id = m.trail_id
    JOIN module_pills p ON p.module_id = m.id
    WHERE t.course_id = _course_id
      AND (
        lower(coalesce(p.title, ''))   LIKE '%' || _term || '%'
        OR lower(coalesce(p.body_md,'')) LIKE '%' || _term || '%'
        OR lower(coalesce(p.interaction_schema::text, '')) LIKE '%' || _term || '%'
      );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scope_check_course(uuid) TO authenticated;
