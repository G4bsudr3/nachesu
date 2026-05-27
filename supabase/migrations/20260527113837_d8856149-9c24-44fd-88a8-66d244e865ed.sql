CREATE TABLE public.admin_student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body_md text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_student_notes_user ON public.admin_student_notes (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_student_notes TO authenticated;
GRANT ALL ON public.admin_student_notes TO service_role;

ALTER TABLE public.admin_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lê notas internas"
  ON public.admin_student_notes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin cria notas internas"
  ON public.admin_student_notes FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND author_id = auth.uid());

CREATE POLICY "autor edita própria nota"
  ON public.admin_student_notes FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "autor remove própria nota"
  ON public.admin_student_notes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND author_id = auth.uid());

CREATE TRIGGER update_admin_student_notes_updated_at
  BEFORE UPDATE ON public.admin_student_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();