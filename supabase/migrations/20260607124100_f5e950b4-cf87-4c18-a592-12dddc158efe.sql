-- 1. flag de conta de teste em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- 2. recria view de risco ignorando contas teste e quem nunca começou
DROP VIEW IF EXISTS public.student_engagement_risk;

CREATE VIEW public.student_engagement_risk
WITH (security_invoker = true) AS
WITH started_users AS (
  SELECT DISTINCT smp.user_id
  FROM public.student_module_progress smp
  WHERE smp.started_at IS NOT NULL
  UNION
  SELECT DISTINCT md.user_id
  FROM public.module_deliverables md
  WHERE md.content IS NOT NULL
    AND jsonb_typeof(md.content::jsonb) = 'object'
    AND md.content::jsonb <> '{}'::jsonb
),
last_activity AS (
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
INNER JOIN started_users su ON su.user_id = la.user_id
INNER JOIN public.profiles p ON p.user_id = la.user_id AND p.is_test = false
LEFT JOIN released_modules rm ON rm.course_id = la.course_id
LEFT JOIN completed_modules cm ON cm.course_id = la.course_id AND cm.user_id = la.user_id;

GRANT SELECT ON public.student_engagement_risk TO authenticated;

-- 3. view de ativação pendente: matriculados ativos não-teste que nunca tocaram nada
CREATE OR REPLACE VIEW public.student_activation_pending
WITH (security_invoker = true) AS
WITH started_users AS (
  SELECT DISTINCT smp.user_id
  FROM public.student_module_progress smp
  WHERE smp.started_at IS NOT NULL
  UNION
  SELECT DISTINCT md.user_id
  FROM public.module_deliverables md
  WHERE md.content IS NOT NULL
    AND jsonb_typeof(md.content::jsonb) = 'object'
    AND md.content::jsonb <> '{}'::jsonb
)
SELECT
  e.user_id,
  e.course_id,
  e.enrolled_at,
  EXTRACT(DAY FROM now() - e.enrolled_at)::INT AS days_since_enroll
FROM public.enrollments e
INNER JOIN public.profiles p ON p.user_id = e.user_id AND p.is_test = false
LEFT JOIN started_users su ON su.user_id = e.user_id
WHERE e.status = 'active'
  AND su.user_id IS NULL;

GRANT SELECT ON public.student_activation_pending TO authenticated;

-- 4. marca contas internas como teste
UPDATE public.profiles
SET is_test = true
WHERE nickname IN ('mateusfrattezi', 'frattz', 'duduobregon')
   OR display_name IN ('mateus frattezi', 'Mateus Frattz', 'duduobregon', 'frattz');
