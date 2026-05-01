-- tabela de votos no mascote da turma
CREATE TABLE public.mascote_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES public.hub_insights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  candidate_index integer NOT NULL CHECK (candidate_index >= 0 AND candidate_index <= 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insight_id, user_id)
);

CREATE INDEX idx_mascote_votes_insight ON public.mascote_votes(insight_id);
CREATE INDEX idx_mascote_votes_user ON public.mascote_votes(user_id);

ALTER TABLE public.mascote_votes ENABLE ROW LEVEL SECURITY;

-- usuário insere o próprio voto
CREATE POLICY "user vota em nome próprio"
  ON public.mascote_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- usuário lê o próprio voto
CREATE POLICY "user vê próprio voto"
  ON public.mascote_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- admin vê todos os votos
CREATE POLICY "admin vê todos votos"
  ON public.mascote_votes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- admin pode limpar votos de uma rodada (no reabrir)
CREATE POLICY "admin gerencia votos"
  ON public.mascote_votes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mascote_votes;
ALTER TABLE public.mascote_votes REPLICA IDENTITY FULL;