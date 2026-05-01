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
  _group_id uuid;
  _members uuid[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'precisa estar logado para selar a carta';
  END IF;

  SELECT g.id, g.submitted_at
  INTO _group_id, submitted_at
  FROM public.future_letter_groups g
  JOIN public.future_letter_members m ON m.group_id = g.id
  WHERE g.session_id = _session_id
    AND m.user_id = _user_id
  ORDER BY g.created_at DESC
  LIMIT 1;

  IF _group_id IS NOT NULL AND submitted_at IS NOT NULL THEN
    group_id := _group_id;
    RETURN NEXT;
    RETURN;
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

  IF _group_id IS NULL THEN
    _group_id := gen_random_uuid();

    INSERT INTO public.future_letter_groups (id, session_id, letter_text, created_by, submitted_at)
    VALUES (_group_id, _session_id, trim(_letter_text), _user_id, NULL);
  ELSE
    UPDATE public.future_letter_groups
    SET letter_text = trim(_letter_text), created_by = _user_id
    WHERE id = _group_id;

    DELETE FROM public.future_letter_members
    WHERE group_id = _group_id;
  END IF;

  INSERT INTO public.future_letter_members (group_id, user_id)
  SELECT _group_id, member_id
  FROM unnest(_members) AS member_id
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE public.future_letter_groups
  SET submitted_at = now()
  WHERE id = _group_id
  RETURNING future_letter_groups.submitted_at INTO submitted_at;

  group_id := _group_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_future_letter_group(_session_id uuid)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  letter_text text,
  created_by uuid,
  submitted_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone,
  member_user_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    g.id,
    g.session_id,
    CASE WHEN g.submitted_at IS NULL THEN g.letter_text ELSE ''::text END AS letter_text,
    g.created_by,
    g.submitted_at,
    g.sent_at,
    g.created_at,
    COALESCE(array_agg(m.user_id ORDER BY m.created_at), ARRAY[]::uuid[]) AS member_user_ids
  FROM public.future_letter_groups g
  JOIN public.future_letter_members mine ON mine.group_id = g.id AND mine.user_id = auth.uid()
  LEFT JOIN public.future_letter_members m ON m.group_id = g.id
  WHERE g.session_id = _session_id
  GROUP BY g.id, g.session_id, g.letter_text, g.created_by, g.submitted_at, g.sent_at, g.created_at
  ORDER BY g.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.seal_future_letter(uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_future_letter_group(uuid) TO authenticated;