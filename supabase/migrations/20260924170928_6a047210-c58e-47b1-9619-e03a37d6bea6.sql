ALTER TABLE public.enrollments DISABLE TRIGGER USER;

INSERT INTO public.enrollments (user_id, course_id, status)
SELECT u.user_id, c.id, 'active'
FROM (SELECT DISTINCT user_id FROM public.enrollments) u
CROSS JOIN public.courses c
WHERE NOT EXISTS (
  SELECT 1 FROM public.enrollments e
  WHERE e.user_id = u.user_id AND e.course_id = c.id
);

UPDATE public.enrollments SET status = 'active', updated_at = now()
WHERE status <> 'active';

ALTER TABLE public.enrollments ENABLE TRIGGER USER;