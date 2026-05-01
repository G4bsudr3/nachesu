CREATE OR REPLACE FUNCTION public.get_public_card_by_token(_token text)
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
    COALESCE(p.display_name, ip.name) AS display_name,
    COALESCE(p.nickname, ip.nickname) AS nickname,
    bc.is_published,
    COALESCE(aa.image_url, bc.image_url) AS image_url
  FROM public.builder_cards bc
  LEFT JOIN public.profiles p ON p.user_id = bc.user_id
  LEFT JOIN public.invited_participants ip ON ip.id = bc.user_id
  LEFT JOIN public.archetype_artworks aa ON aa.archetype = bc.archetype
  WHERE bc.share_token = _token
    AND bc.is_published = true
    AND bc.status = 'pronta'
  LIMIT 1;
$function$;