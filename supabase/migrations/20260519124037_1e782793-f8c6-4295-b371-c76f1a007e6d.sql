
-- Lista de termos proibidos por slug de curso
CREATE OR REPLACE FUNCTION public.scope_forbidden_terms(_slug text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _slug
    WHEN 'ia-na-pratica' THEN ARRAY[
      'economia circular',
      'negócio regenerativo',
      'negocios regenerativos',
      'regenerativ',
      'ellen macarthur',
      'linear x circular',
      'linear × circular',
      'stakeholder do bairro',
      'metabolismo urbano'
    ]
    WHEN 'economia-circular' THEN ARRAY[
      'prompt',
      'chatgpt',
      'gemini',
      'claude',
      'llama',
      'lovable',
      'modelo de linguagem',
      'large language model',
      ' llm ',
      'ia generativa',
      'engenharia de prompt',
      'multimodal',
      'tokens da ia'
    ]
    ELSE ARRAY[]::text[]
  END;
$$;

-- Função que valida o escopo de um módulo
CREATE OR REPLACE FUNCTION public.assert_module_in_scope(_module_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slug text;
  _terms text[];
  _term text;
  _hit record;
BEGIN
  SELECT c.slug INTO _slug
  FROM modules m
  JOIN trails t ON t.id = m.trail_id
  JOIN courses c ON c.id = t.course_id
  WHERE m.id = _module_id;

  IF _slug IS NULL THEN
    RETURN;
  END IF;

  _terms := public.scope_forbidden_terms(_slug);
  IF array_length(_terms, 1) IS NULL THEN
    RETURN;
  END IF;

  FOREACH _term IN ARRAY _terms LOOP
    SELECT p.title, p.kind::text AS kind
      INTO _hit
    FROM module_pills p
    WHERE p.module_id = _module_id
      AND (
        lower(coalesce(p.title, ''))   LIKE '%' || _term || '%'
        OR lower(coalesce(p.body_md,'')) LIKE '%' || _term || '%'
        OR lower(coalesce(p.interaction_schema::text, '')) LIKE '%' || _term || '%'
      )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION
        'Publicação bloqueada: conteúdo fora do escopo da eletiva "%". Termo "%" encontrado na pílula "%" (%).',
        _slug, _term, _hit.title, _hit.kind
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END;
$$;

-- Trigger: antes de liberar módulo
CREATE OR REPLACE FUNCTION public.trg_release_scope_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_module_in_scope(NEW.module_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS module_releases_scope_check ON public.module_releases;
CREATE TRIGGER module_releases_scope_check
BEFORE INSERT OR UPDATE ON public.module_releases
FOR EACH ROW EXECUTE FUNCTION public.trg_release_scope_check();

-- Trigger: antes de marcar módulo como published
CREATE OR REPLACE FUNCTION public.trg_module_publish_scope_check()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.published = true AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM NEW.published) THEN
    PERFORM public.assert_module_in_scope(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modules_publish_scope_check ON public.modules;
CREATE TRIGGER modules_publish_scope_check
BEFORE INSERT OR UPDATE OF published ON public.modules
FOR EACH ROW EXECUTE FUNCTION public.trg_module_publish_scope_check();
