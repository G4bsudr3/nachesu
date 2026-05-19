
CREATE TYPE notification_kind AS ENUM (
  'deliverable_reviewed',
  'module_released',
  'evasion_nudge',
  'system'
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user vê próprias notificações"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user marca própria notificação como lida"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin gerencia notificações"
ON public.notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE TABLE public.evasion_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('medium', 'high', 'lost')),
  days_inactive INT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  notification_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evasion_user_course ON public.evasion_nudges(user_id, course_id, sent_at DESC);

ALTER TABLE public.evasion_nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin vê nudges" ON public.evasion_nudges FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- view de risco
CREATE OR REPLACE VIEW public.student_engagement_risk
WITH (security_invoker = true) AS
WITH last_activity AS (
  SELECT
    e.user_id,
    e.course_id,
    GREATEST(
      COALESCE(MAX(smp.completed_at), e.enrolled_at),
      COALESCE(MAX(smp.started_at), e.enrolled_at),
      e.enrolled_at
    ) AS last_activity_at
  FROM public.enrollments e
  LEFT JOIN public.trails t ON t.course_id = e.course_id
  LEFT JOIN public.modules m ON m.trail_id = t.id
  LEFT JOIN public.student_module_progress smp
    ON smp.user_id = e.user_id AND smp.module_id = m.id
  WHERE e.status = 'active'
  GROUP BY e.user_id, e.course_id, e.enrolled_at
),
released_modules AS (
  SELECT t.course_id, COUNT(*) AS released_count
  FROM public.modules m
  INNER JOIN public.trails t ON t.id = m.trail_id
  INNER JOIN public.module_releases mr ON mr.module_id = m.id
  GROUP BY t.course_id
),
completed_modules AS (
  SELECT t.course_id, smp.user_id, COUNT(*) AS done_count
  FROM public.student_module_progress smp
  INNER JOIN public.modules m ON m.id = smp.module_id
  INNER JOIN public.trails t ON t.id = m.trail_id
  WHERE smp.completed_at IS NOT NULL
  GROUP BY t.course_id, smp.user_id
)
SELECT
  la.user_id,
  la.course_id,
  la.last_activity_at,
  EXTRACT(DAY FROM now() - la.last_activity_at)::INT AS days_inactive,
  COALESCE(rm.released_count, 0) AS released_count,
  COALESCE(cm.done_count, 0) AS done_count,
  CASE
    WHEN COALESCE(rm.released_count, 0) > 0 AND COALESCE(cm.done_count, 0) >= rm.released_count THEN 'caught_up'
    WHEN EXTRACT(DAY FROM now() - la.last_activity_at) >= 21 THEN 'lost'
    WHEN EXTRACT(DAY FROM now() - la.last_activity_at) >= 14 THEN 'high'
    WHEN EXTRACT(DAY FROM now() - la.last_activity_at) >= 7 THEN 'medium'
    ELSE 'low'
  END AS risk_level
FROM last_activity la
LEFT JOIN released_modules rm ON rm.course_id = la.course_id
LEFT JOIN completed_modules cm ON cm.course_id = la.course_id AND cm.user_id = la.user_id;

GRANT SELECT ON public.student_engagement_risk TO authenticated;

-- trigger: deliverable revisado → notificação
CREATE OR REPLACE FUNCTION public.notify_deliverable_reviewed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module_number INT;
  v_course_slug TEXT;
  v_course_title TEXT;
BEGIN
  IF NEW.status = 'revisado' AND (OLD.status IS DISTINCT FROM 'revisado') THEN
    SELECT m.number, c.slug, c.title
    INTO v_module_number, v_course_slug, v_course_title
    FROM public.modules m
    INNER JOIN public.trails t ON t.id = m.trail_id
    INNER JOIN public.courses c ON c.id = t.course_id
    WHERE m.id = NEW.module_id;

    INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
    VALUES (
      NEW.user_id,
      'deliverable_reviewed',
      'seu educador respondeu',
      CASE
        WHEN NEW.feedback IS NOT NULL AND LENGTH(NEW.feedback) > 0
          THEN 'feedback no módulo ' || COALESCE(v_module_number::TEXT, '?') || ' — ' || COALESCE(v_course_title, 'sua eletiva')
        ELSE 'sua entrega do módulo ' || COALESCE(v_module_number::TEXT, '?') || ' foi revisada'
      END,
      '/app/modulo/' || COALESCE(v_module_number::TEXT, '1'),
      jsonb_build_object(
        'deliverable_id', NEW.id,
        'module_id', NEW.module_id,
        'course_slug', v_course_slug
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_deliverable_reviewed ON public.module_deliverables;
CREATE TRIGGER trg_notify_deliverable_reviewed
AFTER UPDATE ON public.module_deliverables
FOR EACH ROW EXECUTE FUNCTION public.notify_deliverable_reviewed();

-- trigger: módulo liberado → notifica turma
CREATE OR REPLACE FUNCTION public.notify_module_released()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_number INT; v_title TEXT; v_course_id UUID; v_course_title TEXT;
BEGIN
  SELECT m.number, m.title, c.id, c.title
  INTO v_number, v_title, v_course_id, v_course_title
  FROM public.modules m
  INNER JOIN public.trails t ON t.id = m.trail_id
  INNER JOIN public.courses c ON c.id = t.course_id
  WHERE m.id = NEW.module_id;

  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT
    e.user_id,
    'module_released',
    'módulo ' || COALESCE(v_number::TEXT, '?') || ' liberado',
    COALESCE(v_title, 'novo módulo') || ' — ' || COALESCE(v_course_title, 'sua eletiva'),
    '/app/modulo/' || COALESCE(v_number::TEXT, '1'),
    jsonb_build_object('module_id', NEW.module_id, 'course_id', v_course_id)
  FROM public.enrollments e
  WHERE e.course_id = v_course_id AND e.status = 'active';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_module_released ON public.module_releases;
CREATE TRIGGER trg_notify_module_released
AFTER INSERT ON public.module_releases
FOR EACH ROW EXECUTE FUNCTION public.notify_module_released();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
