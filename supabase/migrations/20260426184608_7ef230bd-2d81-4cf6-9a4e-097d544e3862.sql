CREATE OR REPLACE FUNCTION public.save_future_letter_response(
  _session_id uuid,
  _letter_text text,
  _member_user_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  submitted_at timestamptz,
  member_user_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _response_id uuid;
  _submitted_at timestamptz;
  _members uuid[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'precisa estar logado para salvar a carta';
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

  SELECT COALESCE(array_agg(DISTINCT candidate.member_id), ARRAY[_user_id]::uuid[])
  INTO _members
  FROM unnest(array_append(coalesce(_member_user_ids, ARRAY[]::uuid[]), _user_id)) AS candidate(member_id)
  WHERE candidate.member_id IS NOT NULL
    AND (
      candidate.member_id = _user_id
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = candidate.member_id
          AND p.status = 'active'
      )
    );

  IF NOT (_user_id = ANY(_members)) THEN
    _members := array_append(_members, _user_id);
  END IF;

  INSERT INTO public.future_letter_responses (
    session_id,
    letter_text,
    created_by,
    member_user_ids,
    submitted_at
  )
  VALUES (
    _session_id,
    trim(_letter_text),
    _user_id,
    _members,
    now()
  )
  ON CONFLICT (session_id, created_by)
  DO UPDATE SET
    letter_text = EXCLUDED.letter_text,
    member_user_ids = EXCLUDED.member_user_ids,
    submitted_at = now(),
    updated_at = now()
  RETURNING
    future_letter_responses.id,
    future_letter_responses.submitted_at,
    future_letter_responses.member_user_ids
  INTO _response_id, _submitted_at, _members;

  id := _response_id;
  session_id := _session_id;
  submitted_at := _submitted_at;
  member_user_ids := _members;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_future_letter_response(uuid, text, uuid[]) TO authenticated;