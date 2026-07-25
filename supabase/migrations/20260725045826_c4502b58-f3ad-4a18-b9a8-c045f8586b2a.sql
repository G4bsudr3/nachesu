
CREATE OR REPLACE FUNCTION public.admin_module4_evidencias_stats(
  _course_slug text DEFAULT 'economia-circular',
  _module_number int DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _module_id uuid;
  _pill_id uuid;
  _metodo_field text;
  _total_students int;
  _completed_count int;
  _submitted_count int;
  _metodo_dist jsonb;
  _tipo_dist jsonb;
  _real_rate numeric;
  _samples jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT m.id INTO _module_id
  FROM public.modules m
  JOIN public.trails t ON t.id = m.trail_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE c.slug = _course_slug AND m.number = _module_number
  LIMIT 1;

  IF _module_id IS NULL THEN
    RETURN jsonb_build_object('error', 'module_not_found');
  END IF;

  SELECT mp.id, mp.interaction_schema->>'metodo_field_id'
    INTO _pill_id, _metodo_field
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id
    AND mp.interaction_schema->>'type' = 'caca_evidencias'
  ORDER BY mp.order_index
  LIMIT 1;

  IF _pill_id IS NULL THEN
    RETURN jsonb_build_object('error', 'caca_pill_not_found');
  END IF;

  SELECT count(*)::int INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  WHERE c.slug = _course_slug AND e.status = 'active';

  SELECT count(*) FILTER (WHERE completed_at IS NOT NULL)::int
    INTO _completed_count
  FROM public.student_module_progress
  WHERE module_id = _module_id;

  SELECT count(*)::int INTO _submitted_count
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND jsonb_array_length(
      COALESCE(d.content->'caca_evidencias'->_pill_id::text->'evidencias', '[]'::jsonb)
    ) > 0;

  -- distribuição de método
  WITH metodos AS (
    SELECT COALESCE(d.content->'guided_answers'->>_metodo_field, 'não escolhido') AS metodo
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND jsonb_typeof(COALESCE(d.content->'caca_evidencias'->_pill_id::text->'evidencias', '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(d.content->'caca_evidencias'->_pill_id::text->'evidencias', '[]'::jsonb)) > 0
  )
  SELECT COALESCE(jsonb_object_agg(metodo, cnt), '{}'::jsonb)
    INTO _metodo_dist
  FROM (
    SELECT metodo, count(*)::int AS cnt FROM metodos GROUP BY metodo
  ) x;

  -- distribuição de tipo (somando todas as fichas)
  WITH fichas AS (
    SELECT ficha->>'tipo' AS tipo,
           ficha
    FROM public.module_deliverables d,
         LATERAL jsonb_array_elements(
           COALESCE(d.content->'caca_evidencias'->_pill_id::text->'evidencias', '[]'::jsonb)
         ) ficha
    WHERE d.module_id = _module_id
  )
  SELECT COALESCE(jsonb_object_agg(tipo, cnt), '{}'::jsonb)
    INTO _tipo_dist
  FROM (
    SELECT tipo, count(*)::int AS cnt
    FROM fichas
    WHERE tipo IS NOT NULL
    GROUP BY tipo
  ) x;

  -- % de estudantes com pelo menos 1 evidência de origem real
  WITH per_student AS (
    SELECT
      d.user_id,
      bool_or(
        (ficha->'foto'->>'evidence_kind' = 'file' AND (ficha->'foto'->>'evidence_path') IS NOT NULL)
        OR (ficha->'audio'->>'evidence_kind' = 'file' AND (ficha->'audio'->>'evidence_path') IS NOT NULL)
        OR (ficha->>'tipo' = 'coleta' AND ficha->>'link' ~* '^https?://')
      ) AS has_real
    FROM public.module_deliverables d,
         LATERAL jsonb_array_elements(
           COALESCE(d.content->'caca_evidencias'->_pill_id::text->'evidencias', '[]'::jsonb)
         ) ficha
    WHERE d.module_id = _module_id
    GROUP BY d.user_id
  )
  SELECT
    CASE WHEN count(*) > 0
      THEN round(count(*) FILTER (WHERE has_real)::numeric / count(*), 3)
      ELSE 0
    END
  INTO _real_rate
  FROM per_student;

  -- amostras recentes de sínteses (últimas 10, com apelido)
  WITH sintese_rows AS (
    SELECT
      d.user_id,
      d.content->'caca_evidencias'->_pill_id::text->>'sintese' AS sintese,
      COALESCE(d.updated_at, d.created_at) AS ts
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND length(trim(coalesce(d.content->'caca_evidencias'->_pill_id::text->>'sintese', ''))) >= 40
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'nickname', COALESCE(p.nickname, p.display_name, 'estudante'),
    'sintese', s.sintese
  ) ORDER BY s.ts DESC), '[]'::jsonb)
    INTO _samples
  FROM (
    SELECT * FROM sintese_rows ORDER BY ts DESC LIMIT 10
  ) s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'kpis', jsonb_build_object(
      'total_students', _total_students,
      'completed_count', _completed_count,
      'submitted_count', _submitted_count
    ),
    'metodo_distribution', COALESCE(_metodo_dist, '{}'::jsonb),
    'tipo_distribution', COALESCE(_tipo_dist, '{}'::jsonb),
    'real_origin_rate', COALESCE(_real_rate, 0),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;
