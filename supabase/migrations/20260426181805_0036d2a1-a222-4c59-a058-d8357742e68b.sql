CREATE OR REPLACE FUNCTION public.seal_future_letter(
  _session_id uuid,
  _letter_text text,
  _member_user_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE(group_id uuid, submitted_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _group_id uuid := gen_random_uuid();
  _members uuid[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'precisa estar logado para selar a carta';
  END IF;

  IF length(trim(coalesce(_letter_text, ''))) < 10 THEN
    RAISE EXCEPTION 'a carta tá muito curta';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.future_letter_sessions s
    WHERE s.id = _session_id
      AND s.status = 'open'::public.future_letter_session_status
  ) THEN
    RAISE EXCEPTION 'essa sessão de carta não está aberta';
  END IF;

  SELECT array_agg(DISTINCT member_id)
  INTO _members
  FROM unnest(array_append(coalesce(_member_user_ids, ARRAY[]::uuid[]), _user_id)) AS member_id
  WHERE member_id IS NOT NULL;

  IF _members IS NULL OR array_length(_members, 1) IS NULL THEN
    _members := ARRAY[_user_id];
  END IF;

  INSERT INTO public.future_letter_groups (id, session_id, letter_text, created_by, submitted_at)
  VALUES (_group_id, _session_id, trim(_letter_text), _user_id, NULL);

  INSERT INTO public.future_letter_members (group_id, user_id)
  SELECT _group_id, member_id
  FROM unnest(_members) AS member_id
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE public.future_letter_groups
  SET submitted_at = now()
  WHERE id = _group_id;

  RETURN QUERY
  SELECT g.id, g.submitted_at
  FROM public.future_letter_groups g
  WHERE g.id = _group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seal_future_letter(uuid, text, uuid[]) TO authenticated;