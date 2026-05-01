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

  SELECT array_agg(DISTINCT x.member_id)
  INTO _members
  FROM unnest(array_append(coalesce(_member_user_ids, ARRAY[]::uuid[]), _user_id)) AS x(member_id)
  WHERE x.member_id IS NOT NULL;

  IF _members IS NULL OR array_length(_members, 1) IS NULL THEN
    _members := ARRAY[_user_id];
  END IF;

  SELECT g.id
  INTO _group_id
  FROM public.future_letter_groups g
  WHERE g.session_id = _session_id
    AND (
      g.created_by = _user_id
      OR EXISTS (
        SELECT 1
        FROM public.future_letter_members m
        WHERE m.group_id = g.id
          AND m.user_id = _user_id
      )
    )
  ORDER BY g.created_at DESC
  LIMIT 1;

  IF _group_id IS NULL THEN
    INSERT INTO public.future_letter_groups (session_id, letter_text, created_by, submitted_at, sent_at)
    VALUES (_session_id, trim(_letter_text), _user_id, now(), NULL)
    RETURNING id, future_letter_groups.submitted_at INTO _group_id, submitted_at;
  ELSE
    UPDATE public.future_letter_groups
    SET
      letter_text = trim(_letter_text),
      created_by = _user_id,
      submitted_at = coalesce(future_letter_groups.submitted_at, now()),
      sent_at = NULL
    WHERE id = _group_id
    RETURNING future_letter_groups.submitted_at INTO submitted_at;

    DELETE FROM public.future_letter_members
    WHERE future_letter_members.group_id = _group_id;
  END IF;

  INSERT INTO public.future_letter_members (group_id, user_id)
  SELECT _group_id, x.member_id
  FROM unnest(_members) AS x(member_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

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
    g.letter_text,
    g.created_by,
    g.submitted_at,
    g.sent_at,
    g.created_at,
    COALESCE(array_agg(m.user_id ORDER BY m.created_at) FILTER (WHERE m.user_id IS NOT NULL), ARRAY[]::uuid[]) AS member_user_ids
  FROM public.future_letter_groups g
  LEFT JOIN public.future_letter_members mine ON mine.group_id = g.id AND mine.user_id = auth.uid()
  LEFT JOIN public.future_letter_members m ON m.group_id = g.id
  WHERE g.session_id = _session_id
    AND (g.created_by = auth.uid() OR mine.user_id IS NOT NULL)
  GROUP BY g.id, g.session_id, g.letter_text, g.created_by, g.submitted_at, g.sent_at, g.created_at
  ORDER BY g.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.seal_future_letter(uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_future_letter_group(uuid) TO authenticated;