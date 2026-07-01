
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
    _issues := array_append(_issues, 'título vazio');
  END IF;

  IF _body_len = 0 AND NOT _has_schema THEN
    _issues := array_append(_issues, 'sem corpo nem schema');
    RETURN _issues;
  END IF;

  IF _body_len > 0 AND _body_len < 30 AND NOT _has_schema THEN
    _issues := array_append(_issues, 'corpo raso (< 30 chars) e sem schema');
  END IF;

  IF _has_schema THEN
    IF mp.kind::text IN ('pilula_a','pilula_b','pilula_c') THEN
      IF coalesce(length(_s->'aprofundamento'->>'md'), 0) < 20
         AND coalesce(length(_s->'video'->>'url'), 0) = 0
         AND coalesce(length(_s->'gancho'->>'md'), 0) < 20 THEN
        _issues := array_append(_issues, 'pílula editorial sem aprofundamento, vídeo ou gancho');
      END IF;
    ELSIF mp.kind::text = 'exercicio_pbl' THEN
      IF coalesce(jsonb_array_length(coalesce(_s->'passos','[]'::jsonb)), 0) = 0
         AND (_s->'campos') IS NULL
         AND coalesce(jsonb_array_length(coalesce(_s->'prompts','[]'::jsonb)), 0) = 0 THEN
        _issues := array_append(_issues, 'exercício sem passos, campos ou prompts');
      END IF;
    ELSIF mp.kind::text = 'registro' THEN
      IF (_s->'templates') IS NULL
         AND (_s->'commitments') IS NULL
         AND (_s->'campos') IS NULL
         AND (_s->'reflexao') IS NULL THEN
        _issues := array_append(_issues, 'registro sem templates, commitments, campos ou reflexão');
      END IF;
    END IF;
  END IF;

  RETURN _issues;
END;
$$;
