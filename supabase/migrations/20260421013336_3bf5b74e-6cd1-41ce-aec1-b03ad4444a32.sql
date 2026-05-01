DROP FUNCTION IF EXISTS public.get_public_card_by_token(text);

CREATE FUNCTION public.get_public_card_by_token(_token text)
 RETURNS TABLE(archetype builder_archetype, emoji text, tagline text, essence_phrase text, superpower_preview text, display_name text, nickname text, is_published boolean, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    bc.archetype,
    bc.emoji,
    bc.tagline,
    bc.essence_phrase,
    CASE
      WHEN bc.superpower_text IS NOT NULL
      THEN split_part(bc.superpower_text, E'\n\n', 1)
      ELSE NULL
    END AS superpower_preview,
    p.display_name,
    p.nickname,
    bc.is_published,
    bc.image_url
  FROM public.builder_cards bc
  LEFT JOIN public.profiles p ON p.user_id = bc.user_id
  WHERE bc.share_token = _token
    AND bc.is_published = true
    AND bc.status = 'pronta'
  LIMIT 1;
$function$;

INSERT INTO public.archetype_artwork_versions (archetype, image_url, prompt_used, model, generated_at, is_current)
SELECT aa.archetype, aa.image_url, aa.prompt_used, aa.model, aa.generated_at, true
FROM public.archetype_artworks aa
WHERE NOT EXISTS (
  SELECT 1 FROM public.archetype_artwork_versions aav
  WHERE aav.archetype = aa.archetype AND aav.is_current = true
);