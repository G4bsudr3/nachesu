
-- Enum status
CREATE TYPE public.project_voting_session_status AS ENUM ('draft', 'open', 'closed');

-- Sessões de votação
CREATE TABLE public.project_voting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.project_voting_session_status NOT NULL DEFAULT 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_voting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia sessoes votacao projetos"
ON public.project_voting_sessions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "aluno ve sessoes abertas ou fechadas"
ON public.project_voting_sessions
FOR SELECT TO authenticated
USING (status IN ('open','closed'));

CREATE TRIGGER trg_pvs_updated
BEFORE UPDATE ON public.project_voting_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votos
CREATE TABLE public.project_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.project_voting_sessions(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.hub_projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, voter_user_id)
);

CREATE INDEX idx_project_votes_session_project ON public.project_votes(session_id, project_id);

ALTER TABLE public.project_votes ENABLE ROW LEVEL SECURITY;

-- Validações: não pode votar no próprio projeto, sessão deve estar aberta
CREATE OR REPLACE FUNCTION public.validate_project_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner uuid;
  _status public.project_voting_session_status;
BEGIN
  SELECT user_id INTO _owner FROM public.hub_projects WHERE id = NEW.project_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'projeto não existe';
  END IF;
  IF _owner = NEW.voter_user_id THEN
    RAISE EXCEPTION 'não pode votar no próprio projeto';
  END IF;

  SELECT status INTO _status FROM public.project_voting_sessions WHERE id = NEW.session_id;
  IF _status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'sessão de votação não está aberta';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_project_vote
BEFORE INSERT OR UPDATE ON public.project_votes
FOR EACH ROW EXECUTE FUNCTION public.validate_project_vote();

-- RLS votes
CREATE POLICY "admin ve todos votos projetos"
ON public.project_votes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "aluno ve proprio voto"
ON public.project_votes FOR SELECT TO authenticated
USING (auth.uid() = voter_user_id);

CREATE POLICY "aluno cria proprio voto"
ON public.project_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "aluno troca proprio voto"
ON public.project_votes FOR UPDATE TO authenticated
USING (auth.uid() = voter_user_id)
WITH CHECK (auth.uid() = voter_user_id);

CREATE POLICY "aluno remove proprio voto"
ON public.project_votes FOR DELETE TO authenticated
USING (auth.uid() = voter_user_id);

-- RPC: top 10 (só quando sessão fechada)
CREATE OR REPLACE FUNCTION public.get_project_voting_top_ten(_session_id uuid)
RETURNS TABLE(
  rank int,
  project_id uuid,
  title text,
  description text,
  link text,
  cover_url text,
  tags text[],
  author_user_id uuid,
  author_display_name text,
  author_nickname text,
  vote_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH s AS (
    SELECT status FROM public.project_voting_sessions WHERE id = _session_id
  ),
  counts AS (
    SELECT pv.project_id, count(*)::bigint AS vote_count
    FROM public.project_votes pv
    WHERE pv.session_id = _session_id
    GROUP BY pv.project_id
  ),
  ranked AS (
    SELECT
      hp.id AS project_id,
      hp.title,
      hp.description,
      hp.link,
      hp.cover_url,
      hp.tags,
      hp.user_id AS author_user_id,
      p.display_name AS author_display_name,
      p.nickname AS author_nickname,
      c.vote_count,
      ROW_NUMBER() OVER (ORDER BY c.vote_count DESC, hp.created_at ASC)::int AS rank
    FROM counts c
    JOIN public.hub_projects hp ON hp.id = c.project_id
    LEFT JOIN public.profiles p ON p.user_id = hp.user_id
  )
  SELECT rank, project_id, title, description, link, cover_url, tags,
         author_user_id, author_display_name, author_nickname, vote_count
  FROM ranked, s
  WHERE (s.status = 'closed' OR public.has_role(auth.uid(), 'admin'::app_role))
    AND rank <= 10
  ORDER BY rank;
$$;

-- RPC: resultado do meu voto (só pra mim)
CREATE OR REPLACE FUNCTION public.get_my_project_vote_result(_session_id uuid)
RETURNS TABLE(
  project_id uuid,
  title text,
  vote_count bigint,
  rank int,
  in_top_ten boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH my_vote AS (
    SELECT project_id FROM public.project_votes
    WHERE session_id = _session_id AND voter_user_id = auth.uid()
    LIMIT 1
  ),
  counts AS (
    SELECT pv.project_id, count(*)::bigint AS vote_count
    FROM public.project_votes pv
    WHERE pv.session_id = _session_id
    GROUP BY pv.project_id
  ),
  ranked AS (
    SELECT c.project_id, c.vote_count,
      ROW_NUMBER() OVER (ORDER BY c.vote_count DESC, hp.created_at ASC)::int AS rank
    FROM counts c
    JOIN public.hub_projects hp ON hp.id = c.project_id
  ),
  closed_check AS (
    SELECT status FROM public.project_voting_sessions WHERE id = _session_id
  )
  SELECT r.project_id, hp.title, r.vote_count, r.rank, (r.rank <= 10) AS in_top_ten
  FROM my_vote mv
  JOIN ranked r ON r.project_id = mv.project_id
  JOIN public.hub_projects hp ON hp.id = mv.project_id
  CROSS JOIN closed_check cc
  WHERE cc.status = 'closed';
$$;
