-- Tabela de itens de pré-work
CREATE TABLE public.prework_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url TEXT,
  duracao_min INTEGER,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prework_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados veem itens publicados"
ON public.prework_items FOR SELECT TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin gerencia itens prework"
ON public.prework_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_prework_items_updated_at
BEFORE UPDATE ON public.prework_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de progresso do pré-work
CREATE TABLE public.prework_progress (
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.prework_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.prework_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuário vê próprio progresso"
ON public.prework_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todo progresso"
ON public.prework_progress FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "usuário cria próprio progresso"
ON public.prework_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuário remove próprio progresso"
ON public.prework_progress FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Seed inicial
INSERT INTO public.prework_items (ordem, tipo, titulo, descricao, url, duracao_min, obrigatorio) VALUES
(1, 'leitura', 'boas-vindas à imersão', 'leia esse manifesto curto sobre o que esperar nos 2 dias de imersão chora lovable.', 'https://perestroika.com.br', 3, true),
(2, 'video', 'lovable em 10 minutos', 'um overview rápido da plataforma. se já manja, pula pra parte de boas práticas no final.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 10, true),
(3, 'leitura', 'a arte do prompt', 'guia prático sobre como conversar com IA pra construir software de verdade.', 'https://docs.lovable.dev', 8, true),
(4, 'exercicio', 'seu primeiro app no lovable', 'crie uma landing page de 1 sessão sobre um projeto seu. salva o link, a gente vai usar.', 'https://lovable.dev', 30, true),
(5, 'video', 'pensamento de produto', 'como sair da ideia solta e chegar num escopo construível em 2 dias.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 15, false),
(6, 'leitura', 'iteração > perfeição', 'por que mostrar feio e cedo é melhor que esconder bonito e tarde.', 'https://perestroika.com.br', 5, false);