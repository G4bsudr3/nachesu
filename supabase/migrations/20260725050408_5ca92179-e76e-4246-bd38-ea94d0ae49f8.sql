
-- distribuição de fluxos escolhidos pela turma (aula 5 — pergunta q3-fluxo)
CREATE OR REPLACE FUNCTION public.get_fluxo_turma_distribution(_module_id uuid, _field_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _out jsonb;
  _total int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'precisa estar logado';
  END IF;

  SELECT count(*)::int INTO _total
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND (d.content->'guided_answers'->>_field_id) IS NOT NULL
    AND length(trim(d.content->'guided_answers'->>_field_id)) > 0;

  SELECT COALESCE(jsonb_object_agg(fluxo, cnt), '{}'::jsonb)
    INTO _out
  FROM (
    SELECT (d.content->'guided_answers'->>_field_id) AS fluxo,
           count(*)::int AS cnt
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'guided_answers'->>_field_id) IS NOT NULL
      AND length(trim(d.content->'guided_answers'->>_field_id)) > 0
    GROUP BY 1
  ) x;

  RETURN jsonb_build_object('total', COALESCE(_total, 0), 'counts', COALESCE(_out, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.get_fluxo_turma_distribution(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fluxo_turma_distribution(uuid, text) TO authenticated;

-- admin: estatísticas do briefing da aula 5
CREATE OR REPLACE FUNCTION public.admin_module5_briefing_stats(
  _course_slug text DEFAULT 'economia-circular',
  _module_number int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _module_id uuid;
  _pill_id uuid;
  _fluxo_field text;
  _total_students int;
  _completed_count int;
  _briefing_count int;
  _fluxo_dist jsonb;
  _semaforo jsonb;
  _troca_rate numeric;
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

  SELECT mp.id, mp.interaction_schema->>'fluxo_field_id'
    INTO _pill_id, _fluxo_field
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id
    AND mp.interaction_schema->>'type' = 'quatro_filtros_briefing'
  ORDER BY mp.order_index
  LIMIT 1;

  SELECT count(*)::int INTO _total_students
  FROM public.enrollments e
  JOIN public.courses c ON c.id = e.course_id
  WHERE c.slug = _course_slug AND e.status = 'active';

  SELECT count(*) FILTER (WHERE completed_at IS NOT NULL)::int
    INTO _completed_count
  FROM public.student_module_progress
  WHERE module_id = _module_id;

  SELECT count(*)::int INTO _briefing_count
  FROM public.module_deliverables d
  WHERE d.module_id = _module_id
    AND (d.content->'briefing_aula5'->_pill_id::text->>'hmw') IS NOT NULL
    AND length(trim(d.content->'briefing_aula5'->_pill_id::text->>'hmw')) > 0;

  SELECT COALESCE(jsonb_object_agg(fluxo, cnt), '{}'::jsonb)
    INTO _fluxo_dist
  FROM (
    SELECT (d.content->'briefing_aula5'->_pill_id::text->>'fluxo_principal') AS fluxo,
           count(*)::int AS cnt
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'briefing_aula5'->_pill_id::text->>'fluxo_principal') IS NOT NULL
    GROUP BY 1
  ) x;

  -- semáforo dos 4 filtros: forte = respostas indicando "sim forte" (idx 0)
  WITH filtros AS (
    SELECT
      (d.content->'briefing_aula5'->_pill_id::text->'filtros'->>'evidencia') AS f1,
      (d.content->'briefing_aula5'->_pill_id::text->'filtros'->>'incomodo')  AS f2,
      (d.content->'briefing_aula5'->_pill_id::text->'filtros'->>'tradeoff')  AS f3,
      (d.content->'briefing_aula5'->_pill_id::text->'filtros'->>'fluxo')     AS f4
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'briefing_aula5'->_pill_id::text->'filtros') IS NOT NULL
  ),
  scored AS (
    SELECT
      (CASE WHEN f1 = 'forte' THEN 1 ELSE 0 END
       + CASE WHEN f2 = 'forte' THEN 1 ELSE 0 END
       + CASE WHEN f3 = 'forte' THEN 1 ELSE 0 END
       + CASE WHEN f4 = 'forte' THEN 1 ELSE 0 END) AS score
    FROM filtros
  )
  SELECT jsonb_build_object(
    'verde', count(*) FILTER (WHERE score = 4)::int,
    'amarelo', count(*) FILTER (WHERE score BETWEEN 2 AND 3)::int,
    'vermelho', count(*) FILTER (WHERE score <= 1)::int
  ) INTO _semaforo FROM scored;

  -- % que trocou de problema (flag opcional guardada pelo aluno)
  WITH tr AS (
    SELECT (d.content->'briefing_aula5'->_pill_id::text->>'trocou_problema')::boolean AS trocou
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND (d.content->'briefing_aula5'->_pill_id::text->>'hmw') IS NOT NULL
      AND length(trim(d.content->'briefing_aula5'->_pill_id::text->>'hmw')) > 0
  )
  SELECT CASE WHEN count(*) > 0
    THEN round(count(*) FILTER (WHERE trocou)::numeric / count(*), 3)
    ELSE 0 END
  INTO _troca_rate
  FROM tr;

  -- amostras recentes de HMWs (últimos 12 com apelido)
  WITH s AS (
    SELECT
      d.user_id,
      d.content->'briefing_aula5'->_pill_id::text->>'titulo' AS titulo,
      d.content->'briefing_aula5'->_pill_id::text->>'hmw' AS hmw,
      d.content->'briefing_aula5'->_pill_id::text->>'fluxo_principal' AS fluxo,
      COALESCE(d.updated_at, d.created_at) AS ts
    FROM public.module_deliverables d
    WHERE d.module_id = _module_id
      AND length(trim(coalesce(d.content->'briefing_aula5'->_pill_id::text->>'hmw', ''))) >= 30
    ORDER BY COALESCE(d.updated_at, d.created_at) DESC
    LIMIT 12
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'nickname', COALESCE(p.nickname, p.display_name, 'estudante'),
    'titulo', s.titulo,
    'hmw', s.hmw,
    'fluxo', s.fluxo
  ) ORDER BY s.ts DESC), '[]'::jsonb)
    INTO _samples
  FROM s LEFT JOIN public.profiles p ON p.user_id = s.user_id;

  RETURN jsonb_build_object(
    'module_id', _module_id,
    'pill_id', _pill_id,
    'kpis', jsonb_build_object(
      'total_students', _total_students,
      'completed_count', _completed_count,
      'briefing_count', _briefing_count,
      'troca_rate', COALESCE(_troca_rate, 0)
    ),
    'fluxo_distribution', COALESCE(_fluxo_dist, '{}'::jsonb),
    'semaforo', COALESCE(_semaforo, jsonb_build_object('verde',0,'amarelo',0,'vermelho',0)),
    'samples', COALESCE(_samples, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_module5_briefing_stats(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_module5_briefing_stats(text, int) TO authenticated;
