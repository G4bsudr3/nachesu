CREATE OR REPLACE FUNCTION public.get_my_future_letter_response(_session_id uuid)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  letter_text text,
  created_by uuid,
  submitted_at timestamptz,
  created_at timestamptz,
  member_user_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.session_id,
    r.letter_text,
    r.created_by,
    r.submitted_at,
    r.created_at,
    r.member_user_ids
  FROM public.future_letter_responses r
  WHERE r.session_id = _session_id
    AND r.created_by = auth.uid()
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_future_letter_response(uuid) TO authenticated;