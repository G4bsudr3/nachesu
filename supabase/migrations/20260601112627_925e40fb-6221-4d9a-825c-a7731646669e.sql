CREATE OR REPLACE FUNCTION public.get_course_invite_stats(_course_id uuid, _since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stats jsonb;
  _total_invites int;
  _claimed int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE claimed_at IS NOT NULL)
    INTO _total_invites, _claimed
  FROM public.course_invites
  WHERE course_id = _course_id;

  WITH msgs AS (
    SELECT DISTINCT message_id
    FROM public.email_send_log
    WHERE template_name = 'course-invite'
      AND message_id IS NOT NULL
      AND created_at >= _since
      AND (metadata->>'course_id')::uuid = _course_id
  ),
  latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.status, l.created_at
    FROM public.email_send_log l
    JOIN msgs m ON m.message_id = l.message_id
    ORDER BY l.message_id, l.created_at DESC
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
  proc AS (
    SELECT
      l.message_id,
      min(l.created_at) FILTER (WHERE l.status = 'pending') AS started,
      min(l.created_at) FILTER (WHERE l.status = 'sent') AS sent_at
    FROM public.email_send_log l
    JOIN msgs m ON m.message_id = l.message_id
    GROUP BY l.message_id
    HAVING min(l.created_at) FILTER (WHERE l.status = 'pending') IS NOT NULL
       AND min(l.created_at) FILTER (WHERE l.status = 'sent') IS NOT NULL
  )
  SELECT jsonb_build_object(
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
  WITH msgs AS (
    SELECT
      l.message_id,
      nullif(l.metadata->>'course_id','')::uuid AS course_id,
      l.created_at AS started_at
    FROM public.email_send_log l
    WHERE l.template_name = 'course-invite'
      AND l.message_id IS NOT NULL
      AND l.status = 'pending'
      AND l.created_at >= _since
      AND (_course_id IS NULL OR (l.metadata->>'course_id')::uuid = _course_id)
  ),
  latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.recipient_email, l.status, l.error_message, l.created_at
    FROM public.email_send_log l
    JOIN msgs m ON m.message_id = l.message_id
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT
    latest.message_id,
    latest.recipient_email,
    latest.status,
    latest.error_message,
    latest.created_at,
    CASE WHEN latest.status = 'sent'
      THEN extract(epoch from (latest.created_at - m.started_at)) * 1000
      ELSE NULL END AS processing_ms,
    m.course_id
  FROM latest
  JOIN msgs m ON m.message_id = latest.message_id
  ORDER BY latest.created_at DESC
  LIMIT _limit;
END;
$$;