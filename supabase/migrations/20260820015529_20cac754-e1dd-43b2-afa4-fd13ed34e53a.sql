-- normaliza tipografia e vocabulário do conteúdo das aulas (publicadas e rascunhos)
CREATE OR REPLACE FUNCTION public._fix_copy(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   replace(replace(replace($1, '** — ', '**: '), ' — ', ', '), '—', ','),
                 '\malunas\M', 'estudantes', 'g'),
               '\malunos\M', 'estudantes', 'g'),
             '\maluna\M', 'estudante', 'g'),
           '\maluno\M', 'estudante', 'g'),
         '\mALUNOS?\M', 'ESTUDANTES', 'g');
$$;

UPDATE public.module_pills
SET body_md = public._fix_copy(body_md),
    title = public._fix_copy(title),
    interaction_schema = CASE WHEN interaction_schema IS NULL THEN NULL
      ELSE public._fix_copy(interaction_schema::text)::jsonb END
WHERE coalesce(body_md,'')||coalesce(title,'')||coalesce(interaction_schema::text,'') ~ '(—|\maluno|\maluna|\malunos|\malunas)';

UPDATE public.modules
SET title = public._fix_copy(title),
    objective = public._fix_copy(objective),
    deliverable_description = public._fix_copy(deliverable_description)
WHERE coalesce(title,'')||coalesce(objective,'')||coalesce(deliverable_description,'') ~ '(—|\maluno|\maluna|\malunos|\malunas)';

DROP FUNCTION public._fix_copy(text);