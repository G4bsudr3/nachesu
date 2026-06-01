-- 1. função helper pra checar domínio sebrae
CREATE OR REPLACE FUNCTION public.is_sebrae_edu_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(_email)) LIKE '%@edu.sebrae.com.br';
$$;

-- 2. estende handle_new_user pra honrar chosen_course_slug em emails @edu.sebrae.com.br
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  _email text := lower(new.email);
  _invited public.invited_participants%rowtype;
  _local text := split_part(new.email,'@',1);
  _clean text := initcap(lower(regexp_replace(_local, '[._\-]+', ' ', 'g')));
  _chosen_slug text := nullif(trim(new.raw_user_meta_data ->> 'chosen_course_slug'), '');
  _has_invite boolean := exists (select 1 from public.course_invites where email_normalized = _email);
  _chosen_course_id uuid;
  _is_sebrae boolean := public.is_sebrae_edu_email(_email);
begin
  select * into _invited from public.invited_participants
   where email = _email limit 1;

  -- decide status: invited (Chŏra legado), sebrae edu, ou pending
  insert into public.profiles (user_id, display_name, nickname, status, has_password)
  values (
    new.id,
    coalesce(_invited.name, new.raw_user_meta_data ->> 'display_name', _clean),
    coalesce(_invited.nickname, new.raw_user_meta_data ->> 'nickname', _clean),
    case
      when _invited.id is not null then 'active'
      when _is_sebrae then 'active'
      when _has_invite then 'active'
      else 'pending'
    end,
    new.encrypted_password is not null
  );

  insert into public.user_roles (user_id, role) values (new.id, 'participant');

  update public.fbi_responses
    set user_id = new.id
    where email = _email
      and user_id is null;

  if _invited.id is not null then
    delete from public.builder_cards where user_id = new.id;
    update public.builder_cards
      set user_id = new.id,
          updated_at = now()
      where user_id = _invited.id;
  end if;

  -- sebrae edu sem convite prévio → matricula na eletiva escolhida no signup
  if _is_sebrae and not _has_invite and _chosen_slug is not null then
    select id into _chosen_course_id
    from public.courses
    where slug = _chosen_slug
    limit 1;

    if _chosen_course_id is not null then
      insert into public.enrollments (user_id, course_id, status)
      values (new.id, _chosen_course_id, 'active')
      on conflict (user_id, course_id) do nothing;
    end if;
  end if;

  return new;
end
$function$;

-- 3. stats por curso pra painel admin
CREATE OR REPLACE FUNCTION public.get_course_invite_stats(_course_id uuid, _since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _total_invites int;
  _claimed int;
  _stats jsonb;
  _avg_ms numeric;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE claimed_at IS NOT NULL)
    INTO _total_invites, _claimed
  FROM public.course_invites
  WHERE course_id = _course_id;

  -- dedup por message_id, último status
  WITH latest AS (
    SELECT DISTINCT ON (message_id)
      message_id, status, created_at, recipient_email
    FROM public.email_send_log
    WHERE template_name = 'course-invite'
      AND message_id IS NOT NULL
      AND (metadata->>'course_id')::uuid = _course_id
      AND created_at >= _since
    ORDER BY message_id, created_at DESC
  ),
  counts AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'sent')::int AS sent,
      count(*) FILTER (WHERE status IN ('failed','dlq','bounced'))::int AS failed,
      count(*) FILTER (WHERE status = 'suppressed')::int AS suppressed,
      count(*) FILTER (WHERE status = 'pending')::int AS pending,
      count(*) FILTER (WHERE status = 'complained')::int AS complained
    FROM latest
  ),
  -- tempo médio de processamento: diff entre pending e sent pra mesmo message_id
  proc AS (
    SELECT
      l.message_id,
      min(l.created_at) FILTER (WHERE l.status = 'pending') AS started,
      min(l.created_at) FILTER (WHERE l.status = 'sent') AS sent_at
    FROM public.email_send_log l
    WHERE l.template_name = 'course-invite'
      AND l.message_id IS NOT NULL
      AND (l.metadata->>'course_id')::uuid = _course_id
      AND l.created_at >= _since
    GROUP BY l.message_id
    HAVING min(l.created_at) FILTER (WHERE l.status = 'pending') IS NOT NULL
       AND min(l.created_at) FILTER (WHERE l.status = 'sent') IS NOT NULL
  )
  SELECT
    jsonb_build_object(
      'total_sends', c.total,
      'sent', c.sent,
      'failed', c.failed,
      'suppressed', c.suppressed,
      'pending', c.pending,
      'complained', c.complained,
      'avg_processing_ms', coalesce((SELECT avg(extract(epoch from (sent_at - started)) * 1000) FROM proc), 0),
      'median_processing_ms', coalesce((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch from (sent_at - started)) * 1000) FROM proc), 0)
    )
  INTO _stats
  FROM counts c;

  RETURN _stats || jsonb_build_object(
    'total_invites', _total_invites,
    'claimed', _claimed,
    'claim_rate', CASE WHEN _total_invites > 0 THEN round((_claimed::numeric / _total_invites) * 100, 1) ELSE 0 END
  );
END;
$$;

-- 4. retorna últimos sends pra tabela ao vivo do painel
CREATE OR REPLACE FUNCTION public.get_course_invite_log(_course_id uuid, _since timestamptz, _limit int DEFAULT 100)
RETURNS TABLE(
  message_id text,
  recipient_email text,
  status text,
  error_message text,
  created_at timestamptz,
  processing_ms numeric,
  course_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.recipient_email, l.status, l.error_message, l.created_at, l.metadata
    FROM public.email_send_log l
    WHERE l.template_name = 'course-invite'
      AND l.message_id IS NOT NULL
      AND (_course_id IS NULL OR (l.metadata->>'course_id')::uuid = _course_id)
      AND l.created_at >= _since
    ORDER BY l.message_id, l.created_at DESC
  ),
  starts AS (
    SELECT l.message_id, min(l.created_at) AS started
    FROM public.email_send_log l
    WHERE l.template_name = 'course-invite'
      AND l.message_id IS NOT NULL
      AND l.status = 'pending'
      AND l.created_at >= _since
    GROUP BY l.message_id
  )
  SELECT
    latest.message_id,
    latest.recipient_email,
    latest.status,
    latest.error_message,
    latest.created_at,
    CASE WHEN latest.status = 'sent' AND s.started IS NOT NULL
      THEN extract(epoch from (latest.created_at - s.started)) * 1000
      ELSE NULL END AS processing_ms,
    nullif(latest.metadata->>'course_id', '')::uuid AS course_id
  FROM latest
  LEFT JOIN starts s ON s.message_id = latest.message_id
  ORDER BY latest.created_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_sebrae_edu_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_invite_stats(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_invite_log(uuid, timestamptz, int) TO authenticated;