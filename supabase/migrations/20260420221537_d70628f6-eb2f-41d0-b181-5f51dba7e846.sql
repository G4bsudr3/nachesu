CREATE OR REPLACE FUNCTION public.get_my_card_state()
RETURNS TABLE(
  status public.builder_card_status,
  is_published boolean,
  has_card boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bc.status,
    bc.is_published,
    true AS has_card
  FROM public.builder_cards bc
  WHERE bc.user_id = auth.uid()
  LIMIT 1;
$$;