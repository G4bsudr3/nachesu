
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  professor_name text NOT NULL,
  professor_bio_md text,
  professor_avatar_url text,
  hero_image_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.course_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, email_normalized)
);
CREATE INDEX idx_course_invites_email ON public.course_invites(email_normalized);
ALTER TABLE public.course_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.module_releases (
  module_id uuid PRIMARY KEY REFERENCES public.modules(id) ON DELETE CASCADE,
  released_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.module_releases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trails ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
ALTER TABLE public.tutor_conversations ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
CREATE INDEX idx_trails_course ON public.trails(course_id);
CREATE INDEX idx_tutor_conversations_course ON public.tutor_conversations(course_id);

INSERT INTO public.courses (id, slug, title, subtitle, professor_name, professor_bio_md, theme, order_index, published) VALUES
(
  'c0a00000-0000-0000-0000-000000000001',
  'ia-na-pratica',
  'IA na Prática',
  'do problema ao app que funciona',
  'frattz',
  'builder, mentor de produto, criou e quebrou bastante coisa pra ensinar a fazer.',
  jsonb_build_object(
    'palette', jsonb_build_object('bg','hsl(var(--brand-bege))','accent','#F756A6','ink','#090909'),
    'fonts', jsonb_build_object('display','League Gothic','body','Urbanist'),
    'doodles', false,
    'tutor_system_prompt', 'tu é o tutor da eletiva IA na Prática (frattz). foco: prompt engineering, MVP no Lovable, iteração rápida, decisões de produto. tom direto, brasileiro, lowercase, frases curtas. nunca usa em-dash.'
  ),
  1, true
),
(
  'c0a00000-0000-0000-0000-000000000002',
  'economia-circular',
  'Economia Circular & Negócios Regenerativos',
  'enxergar, entender, criar e validar negócios regenerativos',
  'Eduardo "Dudu" Brasil',
  'pesquisador e provocador de modelos circulares. ensina a olhar fluxo antes de produto.',
  jsonb_build_object(
    'palette', jsonb_build_object('bg','#F2E4D8','accent','#F25E3D','ink','#1A1A1A'),
    'fonts', jsonb_build_object('display','Sora','body','Urbanist'),
    'doodles', true,
    'tutor_system_prompt', 'tu é o tutor da eletiva Economia Circular & Negócios Regenerativos (Dudu). foco: pensamento sistêmico, mapeamento de fluxos, regeneração, validação leve com gente real. tom investigativo, curioso, provoca o aluno a olhar o sistema antes do produto. lowercase, frases curtas, sem em-dash.'
  ),
  2, true
);

UPDATE public.trails SET course_id = 'c0a00000-0000-0000-0000-000000000001' WHERE course_id IS NULL;

INSERT INTO public.trails (id, course_id, order_index, title, description) VALUES
('22222222-2222-2222-2222-222222222201', 'c0a00000-0000-0000-0000-000000000002', 1, 'Enxergar', 'observar o sistema antes de propor soluções'),
('22222222-2222-2222-2222-222222222202', 'c0a00000-0000-0000-0000-000000000002', 2, 'Entender', 'mapear fluxos, atores e oportunidades'),
('22222222-2222-2222-2222-222222222203', 'c0a00000-0000-0000-0000-000000000002', 3, 'Criar', 'desenhar propostas circulares e regenerativas'),
('22222222-2222-2222-2222-222222222204', 'c0a00000-0000-0000-0000-000000000002', 4, 'Validar', 'testar com gente real e ajustar o modelo');

ALTER TABLE public.modules DROP CONSTRAINT modules_number_key;
ALTER TABLE public.modules ADD CONSTRAINT modules_trail_number_key UNIQUE (trail_id, number);

UPDATE public.modules
SET trail_id = '22222222-2222-2222-2222-222222222201', order_index = 1, number = 1
WHERE id = 'd89dc321-328c-47a9-a97f-e72def107fe9';

DO $$
DECLARE
  trail_enxergar uuid := '22222222-2222-2222-2222-222222222201';
  trail_entender uuid := '22222222-2222-2222-2222-222222222202';
  trail_criar uuid := '22222222-2222-2222-2222-222222222203';
  trail_validar uuid := '22222222-2222-2222-2222-222222222204';
  i int;
  trail_id_val uuid;
  order_in_trail int;
BEGIN
  FOR i IN 2..20 LOOP
    IF i <= 5 THEN trail_id_val := trail_enxergar; order_in_trail := i;
    ELSIF i <= 10 THEN trail_id_val := trail_entender; order_in_trail := i - 5;
    ELSIF i <= 15 THEN trail_id_val := trail_criar; order_in_trail := i - 10;
    ELSE trail_id_val := trail_validar; order_in_trail := i - 15;
    END IF;
    INSERT INTO public.modules (trail_id, number, order_index, title, objective, total_minutes, published)
    VALUES (trail_id_val, i, order_in_trail, 'módulo ' || i || ' (em construção)', 'placeholder — conteúdo será inserido na onda 2', 50, false);
  END LOOP;
END $$;

CREATE POLICY "courses select matriculado ou admin" ON public.courses FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR (published=true AND EXISTS (
  SELECT 1 FROM public.enrollments e WHERE e.course_id=courses.id AND e.user_id=auth.uid() AND e.status='active'
)));
CREATE POLICY "courses admin gerencia" ON public.courses FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "enrollments select própria ou admin" ON public.enrollments FOR SELECT TO authenticated
USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "enrollments admin gerencia" ON public.enrollments FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "course_invites admin gerencia" ON public.course_invites FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "module_releases auth lê" ON public.module_releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "module_releases admin gerencia" ON public.module_releases FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "aluno vê módulos publicados liberados" ON public.modules;
CREATE POLICY "aluno vê módulos liberados se matriculado" ON public.modules FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role)
  OR (
    published=true
    AND EXISTS (SELECT 1 FROM public.module_releases mr WHERE mr.module_id=modules.id)
    AND EXISTS (
      SELECT 1 FROM public.trails t
      JOIN public.enrollments e ON e.course_id=t.course_id
      WHERE t.id=modules.trail_id AND e.user_id=auth.uid() AND e.status='active'
    )
  )
);

INSERT INTO public.enrollments (user_id, course_id)
SELECT p.user_id, c.id FROM public.profiles p CROSS JOIN public.courses c
WHERE p.status='active'
ON CONFLICT (user_id, course_id) DO NOTHING;

INSERT INTO public.module_releases (module_id, released_at)
SELECT id, now() FROM public.modules WHERE published=true
ON CONFLICT (module_id) DO NOTHING;

UPDATE public.tutor_conversations SET course_id='c0a00000-0000-0000-0000-000000000001' WHERE course_id IS NULL;

CREATE OR REPLACE FUNCTION public.claim_course_invites_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _email text := lower(trim(NEW.email));
BEGIN
  INSERT INTO public.enrollments (user_id, course_id)
  SELECT NEW.id, ci.course_id FROM public.course_invites ci
  WHERE ci.email_normalized=_email AND ci.claimed_at IS NULL
  ON CONFLICT (user_id, course_id) DO NOTHING;

  UPDATE public.course_invites SET claimed_at=now(), claimed_by=NEW.id
  WHERE email_normalized=_email AND claimed_at IS NULL;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_claim_course_invites ON auth.users;
CREATE TRIGGER trg_claim_course_invites AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_course_invites_on_signup();
