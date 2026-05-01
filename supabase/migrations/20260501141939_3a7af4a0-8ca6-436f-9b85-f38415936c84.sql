-- ============================================
-- ELETIVA IA NA PRÁTICA — schema base
-- ============================================

-- enums
CREATE TYPE public.pill_kind AS ENUM (
  'pilula_a',
  'pilula_b',
  'pilula_c',
  'exercicio_pbl',
  'registro'
);

CREATE TYPE public.deliverable_kind AS ENUM (
  'link',
  'text',
  'checklist',
  'mixed'
);

CREATE TYPE public.deliverable_status AS ENUM (
  'rascunho',
  'enviado',
  'revisado'
);

-- ============================================
-- trails (trilhas)
-- ============================================
CREATE TABLE public.trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê trilhas"
  ON public.trails FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin gerencia trilhas"
  ON public.trails FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_trails_updated_at
  BEFORE UPDATE ON public.trails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- modules (módulos)
-- ============================================
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  number integer NOT NULL UNIQUE,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  objective text,
  total_minutes integer NOT NULL DEFAULT 50,
  available_from timestamptz,
  published boolean NOT NULL DEFAULT false,
  deliverable_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modules_trail ON public.modules(trail_id);
CREATE INDEX idx_modules_available_from ON public.modules(available_from);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno vê módulos publicados liberados"
  ON public.modules FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      published = true
      AND (available_from IS NULL OR available_from <= now())
    )
  );

CREATE POLICY "admin gerencia módulos"
  ON public.modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- module_pills (pílulas)
-- ============================================
CREATE TABLE public.module_pills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  kind public.pill_kind NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  duration_min_low integer,
  duration_min_high integer,
  video_url text,
  attachment_url text,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pills_module ON public.module_pills(module_id, order_index);

ALTER TABLE public.module_pills ENABLE ROW LEVEL SECURITY;

-- aluno só vê pílula se também enxerga o módulo (por policy do módulo)
CREATE POLICY "aluno vê pílulas de módulos visíveis"
  ON public.module_pills FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_pills.module_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR (m.published = true AND (m.available_from IS NULL OR m.available_from <= now()))
        )
    )
  );

CREATE POLICY "admin gerencia pílulas"
  ON public.module_pills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pills_updated_at
  BEFORE UPDATE ON public.module_pills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- student_pill_progress
-- ============================================
CREATE TABLE public.student_pill_progress (
  user_id uuid NOT NULL,
  pill_id uuid NOT NULL REFERENCES public.module_pills(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pill_id)
);

CREATE INDEX idx_pill_progress_pill ON public.student_pill_progress(pill_id);

ALTER TABLE public.student_pill_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno gerencia próprio progresso pílula"
  ON public.student_pill_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- student_module_progress
-- ============================================
CREATE TABLE public.student_module_progress (
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, module_id)
);

CREATE INDEX idx_module_progress_module ON public.student_module_progress(module_id);

ALTER TABLE public.student_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno gerencia próprio progresso módulo"
  ON public.student_module_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- module_deliverables
-- ============================================
CREATE TABLE public.module_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  kind public.deliverable_kind NOT NULL DEFAULT 'mixed',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.deliverable_status NOT NULL DEFAULT 'rascunho',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

CREATE INDEX idx_deliverables_module ON public.module_deliverables(module_id);
CREATE INDEX idx_deliverables_status ON public.module_deliverables(status);

ALTER TABLE public.module_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno vê próprio entregável"
  ON public.module_deliverables FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "aluno cria próprio entregável"
  ON public.module_deliverables FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "aluno atualiza próprio entregável"
  ON public.module_deliverables FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin revisa entregáveis"
  ON public.module_deliverables FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin remove entregáveis"
  ON public.module_deliverables FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_deliverables_updated_at
  BEFORE UPDATE ON public.module_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- module_ratings
-- ============================================
CREATE TABLE public.module_ratings (
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

ALTER TABLE public.module_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aluno gerencia própria avaliação"
  ON public.module_ratings FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ratings_updated_at
  BEFORE UPDATE ON public.module_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- trigger: auto-completar módulo quando todas as pílulas obrigatórias forem feitas
-- ============================================
CREATE OR REPLACE FUNCTION public.recompute_module_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_module_id uuid;
  v_required_total int;
  v_required_done int;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
    SELECT module_id INTO v_module_id FROM public.module_pills WHERE id = OLD.pill_id;
  ELSE
    v_user_id := NEW.user_id;
    SELECT module_id INTO v_module_id FROM public.module_pills WHERE id = NEW.pill_id;
  END IF;

  IF v_module_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- garante linha de progresso
  INSERT INTO public.student_module_progress (user_id, module_id, started_at)
  VALUES (v_user_id, v_module_id, now())
  ON CONFLICT (user_id, module_id) DO NOTHING;

  SELECT count(*) INTO v_required_total
  FROM public.module_pills
  WHERE module_id = v_module_id AND required = true;

  SELECT count(*) INTO v_required_done
  FROM public.student_pill_progress spp
  JOIN public.module_pills mp ON mp.id = spp.pill_id
  WHERE spp.user_id = v_user_id
    AND mp.module_id = v_module_id
    AND mp.required = true;

  IF v_required_total > 0 AND v_required_done >= v_required_total THEN
    UPDATE public.student_module_progress
       SET completed_at = COALESCE(completed_at, now())
     WHERE user_id = v_user_id AND module_id = v_module_id;
  ELSE
    UPDATE public.student_module_progress
       SET completed_at = NULL
     WHERE user_id = v_user_id AND module_id = v_module_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_pill_progress_recompute
  AFTER INSERT OR DELETE ON public.student_pill_progress
  FOR EACH ROW EXECUTE FUNCTION public.recompute_module_progress();