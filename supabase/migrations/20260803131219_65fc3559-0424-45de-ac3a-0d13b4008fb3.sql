CREATE TABLE public.student_roster (
  email_normalized text PRIMARY KEY,
  full_name text NOT NULL,
  ra text,
  turma text,
  course_hint text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_roster TO authenticated;
GRANT ALL ON public.student_roster TO service_role;

ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_roster admin gerencia"
ON public.student_roster
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_student_roster_updated_at
BEFORE UPDATE ON public.student_roster
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();