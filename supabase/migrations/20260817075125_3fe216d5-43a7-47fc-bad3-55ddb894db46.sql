-- 1. pílula de abertura em vídeo (vazia, despublicada) nos módulos 2..20 de ia-na-pratica
INSERT INTO public.module_pills
  (module_id, order_index, kind, title, body_md, required, published, interaction_schema)
SELECT m.id, 0, 'pilula_a'::pill_kind, 'abertura em vídeo', '', false, false,
  jsonb_build_object(
    'type', 'video_with_transcript',
    'video_url', '',
    'transcript', '',
    'transcript_collapsible', true,
    'completion', jsonb_build_object('type','button','label','começar o módulo')
  )
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
JOIN public.courses c ON c.id = t.course_id
WHERE c.slug = 'ia-na-pratica'
  AND m.number BETWEEN 2 AND 20
  AND NOT EXISTS (
    SELECT 1 FROM public.module_pills p
    WHERE p.module_id = m.id AND p.interaction_schema->>'type' = 'video_with_transcript'
  );

-- 2. módulo 1: converte a pílula de vídeo existente, preservando id e progresso
UPDATE public.module_pills
SET interaction_schema = jsonb_build_object(
      'type', 'video_with_transcript',
      'provider', interaction_schema->>'provider',
      'video_url', coalesce(interaction_schema->>'embed_url', ''),
      'transcript', '',
      'transcript_collapsible', true,
      'completion', jsonb_build_object('type','button','label','começar o módulo')
    )
WHERE id = '3e5e6cee-f080-4ffb-b3ff-7b221e71ecc7'
  AND interaction_schema->>'type' = 'video_embed';

-- 3. publica e libera módulos 11..20
UPDATE public.modules m
SET published = true
FROM public.trails t, public.courses c
WHERE t.id = m.trail_id AND c.id = t.course_id
  AND c.slug = 'ia-na-pratica' AND m.number BETWEEN 11 AND 20
  AND m.published = false;

INSERT INTO public.module_releases (module_id, released_at)
SELECT m.id, now()
FROM public.modules m
JOIN public.trails t ON t.id = m.trail_id
JOIN public.courses c ON c.id = t.course_id
WHERE c.slug = 'ia-na-pratica' AND m.number BETWEEN 11 AND 20
ON CONFLICT (module_id) DO NOTHING;