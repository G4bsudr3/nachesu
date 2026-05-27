
CREATE TABLE public.rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rubrics TO authenticated;
GRANT ALL ON public.rubrics TO service_role;

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê rubricas" ON public.rubrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin gerencia rubricas" ON public.rubrics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_rubrics_updated_at
  BEFORE UPDATE ON public.rubrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- coluna opcional em modules para vincular rubrica
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES public.rubrics(id) ON DELETE SET NULL;

-- seed default
INSERT INTO public.rubrics (slug, name, description, is_default, criteria) VALUES (
  'geral',
  'rubrica geral',
  'rubrica padrão aplicada quando o módulo não define outra',
  true,
  '[
    {"label":"clareza","description":"a entrega comunica a ideia de forma clara e organizada"},
    {"label":"evidência forte","description":"traz dados, exemplos concretos ou referências reais"},
    {"label":"aprofundar","description":"poderia explorar mais o tema ou justificar melhor as escolhas"},
    {"label":"criatividade","description":"propõe um caminho original ou inesperado"},
    {"label":"consistência","description":"as partes da entrega conversam entre si"}
  ]'::jsonb
);
