
ALTER TABLE public.enrollments DISABLE TRIGGER enrollments_single_active_check;

INSERT INTO public.enrollments (user_id, course_id, status)
VALUES 
  ('eeb9045d-9b35-42dd-98e4-355269f0a082', 'c0a00000-0000-0000-0000-000000000001', 'active'),
  ('eeb9045d-9b35-42dd-98e4-355269f0a082', 'c0a00000-0000-0000-0000-000000000002', 'active')
ON CONFLICT (user_id, course_id) DO UPDATE SET status='active';

ALTER TABLE public.enrollments ENABLE TRIGGER enrollments_single_active_check;
