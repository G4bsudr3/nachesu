ALTER TABLE public.builder_cards
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.mark_card_first_view(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.builder_cards
  SET
    first_viewed_at = COALESCE(first_viewed_at, now()),
    view_count = view_count + 1
  WHERE share_token = _token
    AND is_published = true;
$function$;

DROP FUNCTION IF EXISTS public.get_my_card_state();

CREATE FUNCTION public.get_my_card_state()
RETURNS TABLE(
  status builder_card_status,
  is_published boolean,
  has_card boolean,
  view_count integer,
  first_viewed_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    bc.status,
    bc.is_published,
    true AS has_card,
    bc.view_count,
    bc.first_viewed_at
  FROM public.builder_cards bc
  WHERE bc.user_id = auth.uid()
  LIMIT 1;
$function$;