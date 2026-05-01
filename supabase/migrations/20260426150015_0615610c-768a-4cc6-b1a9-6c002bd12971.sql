-- 1. tabela de feedback final
CREATE TABLE public.hub_event_feedback_final (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  nota_imersao INTEGER NOT NULL CHECK (nota_imersao >= 0 AND nota_imersao <= 10),
  nota_profs INTEGER NOT NULL CHECK (nota_profs >= 0 AND nota_profs <= 10),
  melhoria_entregas INTEGER NOT NULL CHECK (melhoria_entregas >= 1 AND melhoria_entregas <= 5),
  nps_recomendacao INTEGER NOT NULL CHECK (nps_recomendacao >= 0 AND nps_recomendacao <= 10),
  geral TEXT,
  mais_gostou TEXT,
  menos_gostou TEXT,
  conteudo_faltou TEXT,
  coracao_aberto TEXT,
  certificate_archetype builder_archetype,
  certificate_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hub_event_feedback_final ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user insere próprio feedback final"
ON public.hub_event_feedback_final FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user vê próprio feedback final"
ON public.hub_event_feedback_final FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user atualiza próprio feedback final"
ON public.hub_event_feedback_final FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todos feedbacks finais"
ON public.hub_event_feedback_final FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin remove feedback final"
ON public.hub_event_feedback_final FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_hub_event_feedback_final_created ON public.hub_event_feedback_final (created_at DESC);

-- 2. tabela de certificados
CREATE TABLE public.hub_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  archetype builder_archetype,
  design_variant TEXT NOT NULL CHECK (design_variant IN ('editorial', 'tarot', 'manifesto')),
  file_url TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hub_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user cria próprio certificado"
ON public.hub_certificates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user atualiza próprio certificado"
ON public.hub_certificates FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "auth lê certificados"
ON public.hub_certificates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "admin remove certificado"
ON public.hub_certificates FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. bucket público pra certificados
INSERT INTO storage.buckets (id, name, public)
VALUES ('hub-certificates', 'hub-certificates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "certificados públicos pra leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'hub-certificates');

CREATE POLICY "user faz upload do próprio certificado"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hub-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "user atualiza próprio certificado storage"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'hub-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "admin remove certificado storage"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'hub-certificates'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. expandir scope do hub_insights pra suportar feedback-final
ALTER TABLE public.hub_insights DROP CONSTRAINT IF EXISTS hub_insights_scope_check;
ALTER TABLE public.hub_insights ADD CONSTRAINT hub_insights_scope_check
CHECK (scope = ANY (ARRAY['global'::text, 'user'::text, 'feedback-d1'::text, 'feedback-d2'::text, 'feedback-final'::text]));