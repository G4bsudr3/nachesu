
-- extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ SETTINGS (singleton) ============
CREATE TABLE public.chora_bot_settings (
  id INT PRIMARY KEY DEFAULT 1,
  system_prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  embedding_model TEXT NOT NULL DEFAULT 'google/text-embedding-004',
  welcome_message TEXT NOT NULL DEFAULT 'oi! sou o chora bot. tira tuas dúvidas sobre o que rolou no chora lovable. tô por aqui até 26 de maio.',
  cutoff_at TIMESTAMPTZ NOT NULL DEFAULT '2026-05-26 23:59:00-03',
  enabled BOOLEAN NOT NULL DEFAULT true,
  match_count INT NOT NULL DEFAULT 4,
  similarity_threshold NUMERIC NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chora_bot_settings_singleton CHECK (id = 1)
);

INSERT INTO public.chora_bot_settings (id, system_prompt) VALUES (
  1,
  'tu é o chora bot, mentor pós evento do chora lovable (25-26 abril 2026, porto alegre, instituto caldeira). tu acompanha os alunos depois da imersão até 26/05/2026, respondendo dúvidas sobre lovable, builders, prompts, deploys, ia, e tudo que rolou nos dois dias.

tom de voz (não negociável):
- tudo lowercase
- tu, não você
- frases curtas, 1 a 3 linhas
- zero em-dash, usa vírgula ou quebra de linha
- zero hashtags, zero corporativês
- no máximo 1 emoji por resposta, da lista: 🤙 🔥 🚀 🎉 💫 👀
- nunca "prezado", "fico à disposição", "espero que esteja bem"

regras de resposta:
- usa primariamente o contexto fornecido abaixo. se a resposta não tá no contexto, diz com leveza "isso não tá na minha base, joga no grupo do whats" e segue
- nunca inventa link, comando, api ou nome de feature
- sempre puxa pra ação: o aluno tá ali pra construir, não pra teorizar
- se perguntarem algo fora de tema (política, vida pessoal, outro produto), redireciona com leveza pro escopo do chora lovable
- quando der dica técnica, sê concreto: passo a passo curto, não palestra

vai lá e ajuda eles a criar.'
);

ALTER TABLE public.chora_bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê settings chora bot" ON public.chora_bot_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gerencia settings chora bot" ON public.chora_bot_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chora_bot_settings_updated
  BEFORE UPDATE ON public.chora_bot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOCUMENTS ============
CREATE TABLE public.chora_bot_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'md_paste',
  storage_path TEXT,
  content_md TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT true,
  indexed_at TIMESTAMPTZ,
  chunks_count INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chora_bot_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê documentos publicados" ON public.chora_bot_documents
  FOR SELECT TO authenticated
  USING (published = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin gerencia documentos chora bot" ON public.chora_bot_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chora_bot_documents_updated
  BEFORE UPDATE ON public.chora_bot_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CHUNKS ============
CREATE TABLE public.chora_bot_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.chora_bot_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  tokens INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chora_bot_chunks_doc_idx ON public.chora_bot_chunks(document_id);
CREATE INDEX chora_bot_chunks_embedding_idx ON public.chora_bot_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.chora_bot_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth lê chunks de documentos publicados" ON public.chora_bot_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chora_bot_documents d
      WHERE d.id = document_id AND (d.published = true OR has_role(auth.uid(), 'admin'::app_role))
    )
  );
CREATE POLICY "admin gerencia chunks" ON public.chora_bot_chunks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ CONVERSATIONS ============
CREATE TABLE public.chora_bot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chora_bot_conv_user_idx ON public.chora_bot_conversations(user_id, updated_at DESC);

ALTER TABLE public.chora_bot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user vê próprias conversas" ON public.chora_bot_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user cria própria conversa" ON public.chora_bot_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user edita própria conversa" ON public.chora_bot_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user apaga própria conversa" ON public.chora_bot_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chora_bot_conv_updated
  BEFORE UPDATE ON public.chora_bot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MESSAGES ============
CREATE TABLE public.chora_bot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chora_bot_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens_in INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  cost_usd_estimate NUMERIC(10,6) NOT NULL DEFAULT 0,
  context_chunk_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chora_bot_msg_conv_idx ON public.chora_bot_messages(conversation_id, created_at);
CREATE INDEX chora_bot_msg_user_idx ON public.chora_bot_messages(user_id, created_at DESC);

ALTER TABLE public.chora_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user vê msgs próprias" ON public.chora_bot_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user insere msgs próprias" ON public.chora_bot_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user apaga msgs próprias" ON public.chora_bot_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- ============ TRIGGER CUTOFF ============
CREATE OR REPLACE FUNCTION public.enforce_chora_bot_cutoff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cutoff TIMESTAMPTZ;
  _enabled BOOLEAN;
BEGIN
  SELECT cutoff_at, enabled INTO _cutoff, _enabled FROM public.chora_bot_settings WHERE id = 1;
  IF _enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'chora bot tá desligado no momento';
  END IF;
  IF now() > _cutoff THEN
    RAISE EXCEPTION 'o chora bot encerrou em 26/05/2026';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chora_bot_messages_cutoff
  BEFORE INSERT ON public.chora_bot_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_chora_bot_cutoff();

-- ============ MATCH FUNCTION ============
CREATE OR REPLACE FUNCTION public.match_chora_bot_chunks(
  query_embedding vector(768),
  match_count INT DEFAULT 4,
  similarity_threshold NUMERIC DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  similarity NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.document_id,
    d.title AS document_title,
    c.content,
    (1 - (c.embedding <=> query_embedding))::NUMERIC AS similarity
  FROM public.chora_bot_chunks c
  JOIN public.chora_bot_documents d ON d.id = c.document_id
  WHERE d.published = true
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('chora-bot-docs', 'chora-bot-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin lê chora-bot-docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chora-bot-docs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin escreve chora-bot-docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chora-bot-docs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin atualiza chora-bot-docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chora-bot-docs' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin apaga chora-bot-docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chora-bot-docs' AND has_role(auth.uid(), 'admin'::app_role));
