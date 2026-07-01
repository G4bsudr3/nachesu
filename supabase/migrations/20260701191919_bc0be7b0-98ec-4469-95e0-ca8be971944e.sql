
-- 1) issues por pílula (função pura, retorna array de strings)
CREATE OR REPLACE FUNCTION public.pill_quality_issues(mp public.module_pills)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  _issues text[] := ARRAY[]::text[];
  _body_len int := length(coalesce(mp.body_md, ''));
  _has_schema boolean := mp.interaction_schema IS NOT NULL
                        AND jsonb_typeof(mp.interaction_schema) = 'object'
                        AND mp.interaction_schema <> '{}'::jsonb;
  _s jsonb := mp.interaction_schema;
BEGIN
  IF mp.title IS NULL OR length(trim(mp.title)) = 0 THEN
    _issues := _issues || 'título vazio';
  END IF;

  -- corpo totalmente vazio (nem body nem schema)
  IF _body_len = 0 AND NOT _has_schema THEN
    _issues := _issues || 'sem corpo nem schema';
    RETURN _issues;
  END IF;

  -- corpo raso sem schema
  IF _body_len > 0 AND _body_len < 30 AND NOT _has_schema THEN
    _issues := _issues || 'corpo raso (< 30 chars) e sem schema';
  END IF;

  IF _has_schema THEN
    IF mp.kind::text IN ('pilula_a','pilula_b','pilula_c') THEN
      -- precisa ter aprofundamento OR vídeo OR gancho
      IF coalesce(length(_s->'aprofundamento'->>'md'), 0) < 20
         AND coalesce(length(_s->'video'->>'url'), 0) = 0
         AND coalesce(length(_s->'gancho'->>'md'), 0) < 20 THEN
        _issues := _issues || 'pílula editorial sem aprofundamento, vídeo ou gancho';
      END IF;
    ELSIF mp.kind::text = 'exercicio_pbl' THEN
      IF coalesce(jsonb_array_length(coalesce(_s->'passos','[]'::jsonb)), 0) = 0
         AND (_s->'campos') IS NULL
         AND coalesce(jsonb_array_length(coalesce(_s->'prompts','[]'::jsonb)), 0) = 0 THEN
        _issues := _issues || 'exercício sem passos, campos ou prompts';
      END IF;
    ELSIF mp.kind::text = 'registro' THEN
      IF (_s->'templates') IS NULL
         AND (_s->'commitments') IS NULL
         AND (_s->'campos') IS NULL
         AND (_s->'reflexao') IS NULL THEN
        _issues := _issues || 'registro sem templates, commitments, campos ou reflexão';
      END IF;
    END IF;
  END IF;

  RETURN _issues;
END;
$$;

-- 2) checagem por módulo (admin only)
CREATE OR REPLACE FUNCTION public.module_quality_check(_module_id uuid)
RETURNS TABLE(pill_id uuid, pill_title text, pill_kind text, issue text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT mp.id, mp.title, mp.kind::text, unnest(public.pill_quality_issues(mp))
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id;
END;
$$;

-- 3) checagem por curso (admin only) — usada pela UI
CREATE OR REPLACE FUNCTION public.module_quality_check_course(_course_id uuid)
RETURNS TABLE(
  module_id uuid,
  module_number int,
  module_title text,
  pill_id uuid,
  pill_title text,
  pill_kind text,
  issue text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT m.id, m.number, m.title, mp.id, mp.title, mp.kind::text,
         unnest(public.pill_quality_issues(mp))
  FROM public.modules m
  JOIN public.trails t ON t.id = m.trail_id
  JOIN public.module_pills mp ON mp.module_id = m.id
  WHERE t.course_id = _course_id;
END;
$$;

-- 4) assert usado pelos triggers
CREATE OR REPLACE FUNCTION public.assert_module_quality(_module_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  _issue_count int;
  _pill_count int;
  _first_issue record;
BEGIN
  SELECT count(*) INTO _pill_count FROM public.module_pills WHERE module_id = _module_id;
  IF _pill_count < 4 THEN
    RAISE EXCEPTION 'Publicação bloqueada: módulo tem só % pílulas (mínimo 4).', _pill_count
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO _issue_count
  FROM public.module_pills mp
  WHERE mp.module_id = _module_id
    AND array_length(public.pill_quality_issues(mp), 1) > 0;

  IF _issue_count > 0 THEN
    SELECT mp.title AS pill_title, mp.kind::text AS kind,
           (public.pill_quality_issues(mp))[1] AS first_issue
      INTO _first_issue
    FROM public.module_pills mp
    WHERE mp.module_id = _module_id
      AND array_length(public.pill_quality_issues(mp), 1) > 0
    LIMIT 1;

    RAISE EXCEPTION 'Publicação bloqueada: % pílula(s) incompleta(s). Ex.: "%" (%) — %.',
      _issue_count, _first_issue.pill_title, _first_issue.kind, _first_issue.first_issue
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- 5) trigger no modules (BEFORE UPDATE) — igual padrão do scope check
CREATE OR REPLACE FUNCTION public.trg_module_publish_quality_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.published = true AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM NEW.published) THEN
    PERFORM public.assert_module_quality(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_module_publish_quality_check ON public.modules;
CREATE TRIGGER trg_module_publish_quality_check
BEFORE INSERT OR UPDATE OF published ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.trg_module_publish_quality_check();

-- 6) trigger em module_releases
CREATE OR REPLACE FUNCTION public.trg_release_quality_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.assert_module_quality(NEW.module_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_quality_check ON public.module_releases;
CREATE TRIGGER trg_release_quality_check
BEFORE INSERT ON public.module_releases
FOR EACH ROW EXECUTE FUNCTION public.trg_release_quality_check();
