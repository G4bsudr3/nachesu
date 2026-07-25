
CREATE OR REPLACE FUNCTION public.admin_module2_classificador_stats(
  _course_slug text DEFAULT 'economia-circular',
  _module_number int DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_id uuid;
  _pill_id uuid;
  _pill_schema jsonb;
  _radar_module_id uuid;
  _total_students int;
  _completed_count int;
  _submitted_count int;
  _distribution jsonb;
  _samples jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT m.id INTO _module_id
  FROM public.modules m
  JOIN public.trails t ON t.id = m.trail_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE c.slug = _course_slug
    AND m.number = _module_number
  LIMIT 1;

  IF _module_id IS NULL THEN
    RETURN jsonb_build_object('error', 'module_not_found');
  END IF;

  SELECT mp.id, mp.interaction_schema
    INTO _pill_id, _pill_schema
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id
    AND mp.interaction_schema->>'type' = 'classificador_linear_circular_regenerativo'
  ORDER BY mp.order_index
  LIMIT 1;

  IF _pill_id IS NULL THEN
    RETURN jsonb_build_object('error', 'classificador_pill_not_found');
  END IF;

  _radar_module_id := NULLIF(_pill_schema->>'radar_source_module_id', '')::uuid;

  SELECT count(*)::int INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  WHERE c.slug = _course_slug AND e.status = 'active';

  SELECT
    count(*) FILTER (WHERE completed_at IS NOT NULL)::int
    INTO _completed_count
  FROM public.student_module_progress
  WHERE module_id = _module_id;

  SELECT count(*)::int INTO _submitted_count
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND (d.content->'classificacao_aula2'->_pill_id::text->'classifications') IS NOT NULL;

  WITH per_student AS (
    SELECT
      d.user_id,
      d.content->'classificacao_aula2'->_pill_id::text->'classifications' AS class_obj,
      d.content->'classificacao_aula2'->_pill_id::text->'justifications' AS just_obj,
      COALESCE(d.updated_at, d.created_at) AS ts
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'classificacao_aula2'->_pill_id::text->'classifications') IS NOT NULL
  ),
  exploded AS (
    SELECT ps.user_id, ps.ts, kv.key AS item_id, kv.value #>> '{}' AS category
    FROM per_student ps,
         LATERAL jsonb_each(ps.class_obj) kv
    WHERE jsonb_typeof(ps.class_obj) = 'object'
  ),
  distribution_rows AS (
    SELECT
      item_id,
      count(*)::int AS total,
      count(*) FILTER (WHERE category = 'linear')::int AS linear,
      count(*) FILTER (WHERE category = 'circular')::int AS circular,
      count(*) FILTER (WHERE category = 'regenerativo')::int AS regenerativo
    FROM exploded
    GROUP BY item_id
  )
  SELECT COALESCE(jsonb_object_agg(item_id,
    jsonb_build_object(
      'total', total,
      'linear', linear,
      'circular', circular,
      'regenerativo', regenerativo
    )
  ), '{}'::jsonb)
  INTO _distribution
  FROM distribution_rows;

  WITH per_student AS (
    SELECT
      d.user_id,
      d.content->'classificacao_aula2'->_pill_id::text->'classifications' AS class_obj,
      d.content->'classificacao_aula2'->_pill_id::text->'justifications' AS just_obj,
      COALESCE(d.updated_at, d.created_at) AS ts
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'classificacao_aula2'->_pill_id::text->'justifications') IS NOT NULL
  ),
  exploded AS (
    SELECT
      ps.user_id,
      ps.ts,
      kv.key AS item_id,
      kv.value #>> '{}' AS justification,
      ps.class_obj->>kv.key AS category
    FROM per_student ps,
         LATERAL jsonb_each(ps.just_obj) kv
    WHERE jsonb_typeof(ps.just_obj) = 'object'
      AND length(trim(coalesce(kv.value #>> '{}', ''))) >= 20
  ),
  ranked AS (
    SELECT
      e.*,
      p.nickname,
      p.display_name,
      row_number() OVER (PARTITION BY e.item_id ORDER BY e.ts DESC) AS rn
    FROM exploded e
    LEFT JOIN public.profiles p ON p.user_id = e.user_id
  ),
  picked AS (
    SELECT * FROM ranked WHERE rn <= 3
  )
  SELECT COALESCE(jsonb_object_agg(item_id, samples), '{}'::jsonb)
  INTO _samples
  FROM (
    SELECT
      item_id,
      jsonb_agg(
        jsonb_build_object(
          'nickname', COALESCE(nickname, display_name, 'estudante'),
          'category', category,
          'text', justification
        ) ORDER BY ts DESC
      ) AS samples
    FROM picked
    GROUP BY item_id
  ) s;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'radar_source_module_id', _radar_module_id,
    'fixed_items', COALESCE(_pill_schema->'fixed_items', '[]'::jsonb),
    'kpis', jsonb_build_object(
      'total_students', _total_students,
      'completed_count', _completed_count,
      'submitted_count', _submitted_count
    ),
    'distribution', _distribution,
    'samples', _samples
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_module2_classificador_stats(text, int) TO authenticated;
