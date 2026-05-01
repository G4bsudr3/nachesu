-- Tabela de missões (curadoria via seed)
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  descricao TEXT,
  instrucao TEXT,
  duracao_min INTEGER,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados veem missões publicadas"
ON public.missions FOR SELECT TO authenticated
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin gerencia missões"
ON public.missions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_missions_updated_at
BEFORE UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enum de status de avaliação
CREATE TYPE public.mission_status AS ENUM ('pendente', 'aprovada', 'ajustar');

-- Tabela de submissões
CREATE TABLE public.mission_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  link TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status public.mission_status NOT NULL DEFAULT 'pendente',
  feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuário vê própria submissão"
ON public.mission_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todas submissões"
ON public.mission_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "usuário cria própria submissão"
ON public.mission_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuário atualiza própria submissão"
ON public.mission_submissions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin atualiza qualquer submissão"
ON public.mission_submissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mission_submissions_updated_at
BEFORE UPDATE ON public.mission_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de 5 missões
INSERT INTO public.missions (ordem, titulo, descricao, instrucao, duracao_min) VALUES
(1, 'manifesto em 1 tela', 'crie uma landing de uma seção que comunique a essência do teu projeto.', 'use o lovable. foco em headline forte, 1 parágrafo de subtítulo e 1 botão. cola o link aqui.', 30),
(2, 'fluxo de auth', 'adicione signup/login no teu projeto e mostra a tela protegida.', 'pode ser email+senha simples. manda o link e em 1-2 frases conta o que aprendeu apanhando.', 45),
(3, 'integração de IA', 'use lovable ai pra gerar algo dinâmico no teu app: resumo, sugestão, classificação.', 'descreve o prompt que tu usou e cola o link onde dá pra ver funcionando.', 45),
(4, 'micro-iteração', 'mostre teu projeto pra alguém fora da turma e aplique 1 ajuste baseado no feedback.', 'cola o link da versão depois do ajuste e conta em 2-3 frases o que mudou e por quê.', 30),
(5, 'o pitch', 'grave um vídeo de 60s mostrando teu projeto.', 'sobe num drive/youtube/loom e cola o link. fala o problema, a solução e o próximo passo.', 20);