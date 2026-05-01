-- =========================================
-- 1. AMPLIAR hub_reactions e hub_comments
-- =========================================

-- hub_reactions: adicionar target_kind, renomear submission_id -> target_id
ALTER TABLE public.hub_reactions ADD COLUMN target_kind text NOT NULL DEFAULT 'submission';
ALTER TABLE public.hub_reactions RENAME COLUMN submission_id TO target_id;

-- hub_comments: mesma coisa + colunas de gif
ALTER TABLE public.hub_comments ADD COLUMN target_kind text NOT NULL DEFAULT 'submission';
ALTER TABLE public.hub_comments RENAME COLUMN submission_id TO target_id;
ALTER TABLE public.hub_comments ADD COLUMN gif_url text;
ALTER TABLE public.hub_comments ADD COLUMN gif_preview_url text;
ALTER TABLE public.hub_comments ADD COLUMN gif_provider text;

-- garantir que comentário tem texto OU gif
ALTER TABLE public.hub_comments
  ADD CONSTRAINT hub_comments_has_content
  CHECK (length(trim(coalesce(body, ''))) > 0 OR gif_url IS NOT NULL);

-- garantir target_kind válido
ALTER TABLE public.hub_reactions
  ADD CONSTRAINT hub_reactions_target_kind_chk
  CHECK (target_kind IN ('submission', 'project'));
ALTER TABLE public.hub_comments
  ADD CONSTRAINT hub_comments_target_kind_chk
  CHECK (target_kind IN ('submission', 'project'));

-- índices úteis
CREATE INDEX idx_hub_reactions_target ON public.hub_reactions (target_id, target_kind);
CREATE INDEX idx_hub_comments_target ON public.hub_comments (target_id, target_kind);

-- =========================================
-- 2. TABELA hub_materials (admin curado)
-- =========================================

CREATE TABLE public.hub_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'outro',
  kind text NOT NULL,
  file_url text,
  external_url text,
  file_mime text,
  file_size_bytes bigint,
  cover_url text,
  order_index integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hub_materials_kind_chk CHECK (kind IN ('file', 'link')),
  CONSTRAINT hub_materials_category_chk CHECK (category IN ('apresentacao', 'referencia', 'leitura', 'template', 'outro')),
  CONSTRAINT hub_materials_url_chk CHECK (
    (kind = 'file' AND file_url IS NOT NULL) OR
    (kind = 'link' AND external_url IS NOT NULL)
  )
);

ALTER TABLE public.hub_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê materiais publicados"
  ON public.hub_materials FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin gerencia materiais"
  ON public.hub_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_hub_materials_updated_at
  BEFORE UPDATE ON public.hub_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. TABELA hub_projects (projeto livre)
-- =========================================

CREATE TABLE public.hub_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  link text NOT NULL,
  cover_url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hub_projects_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  CONSTRAINT hub_projects_desc_len CHECK (char_length(trim(description)) BETWEEN 1 AND 500),
  CONSTRAINT hub_projects_link_chk CHECK (link ~* '^https?://.+')
);

ALTER TABLE public.hub_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê projetos"
  ON public.hub_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "user cria próprio projeto"
  ON public.hub_projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user edita próprio projeto"
  ON public.hub_projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user apaga próprio projeto"
  ON public.hub_projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin gerencia projetos"
  ON public.hub_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_hub_projects_updated_at
  BEFORE UPDATE ON public.hub_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hub_projects_created_at ON public.hub_projects (created_at DESC);
CREATE INDEX idx_hub_projects_user ON public.hub_projects (user_id);

-- =========================================
-- 4. STORAGE BUCKETS
-- =========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('hub-materials', 'hub-materials', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hub-project-covers', 'hub-project-covers', true)
  ON CONFLICT (id) DO NOTHING;

-- materiais: leitura pública, escrita só admin
CREATE POLICY "leitura pública hub-materials"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hub-materials');

CREATE POLICY "admin sobe hub-materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hub-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin atualiza hub-materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hub-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admin apaga hub-materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hub-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- capas de projeto: leitura pública, dono escreve dentro da pasta com seu uid
CREATE POLICY "leitura pública hub-project-covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hub-project-covers');

CREATE POLICY "user sobe sua capa de projeto"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hub-project-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user atualiza sua capa de projeto"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'hub-project-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "user apaga sua capa de projeto"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'hub-project-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );