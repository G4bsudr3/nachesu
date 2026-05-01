-- enum
CREATE TYPE public.future_letter_session_status AS ENUM ('draft', 'open', 'closed', 'sent');

-- TABELA 1: sessions
CREATE TABLE public.future_letter_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  send_at TIMESTAMPTZ NOT NULL,
  status public.future_letter_session_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TABELA 2: groups
CREATE TABLE public.future_letter_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.future_letter_sessions(id) ON DELETE CASCADE,
  letter_text TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_future_letter_groups_session ON public.future_letter_groups(session_id);
CREATE INDEX idx_future_letter_groups_pending ON public.future_letter_groups(sent_at) WHERE sent_at IS NULL AND submitted_at IS NOT NULL;

-- TABELA 3: members
CREATE TABLE public.future_letter_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.future_letter_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_snapshot TEXT,
  email_sent_at TIMESTAMPTZ,
  email_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_future_letter_members_group ON public.future_letter_members(group_id);
CREATE INDEX idx_future_letter_members_user ON public.future_letter_members(user_id);

-- ENABLE RLS
ALTER TABLE public.future_letter_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_letter_members ENABLE ROW LEVEL SECURITY;

-- POLICIES: sessions
CREATE POLICY "admin gerencia sessões carta futuro"
ON public.future_letter_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "aluno vê sessões abertas"
ON public.future_letter_sessions FOR SELECT TO authenticated
USING (status = 'open');

-- POLICIES: groups
CREATE POLICY "admin gerencia grupos carta futuro"
ON public.future_letter_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "aluno cria grupo carta futuro"
ON public.future_letter_groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "aluno vê seu grupo até selar"
ON public.future_letter_groups FOR SELECT TO authenticated
USING (
  submitted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.future_letter_members m
    WHERE m.group_id = future_letter_groups.id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "aluno edita grupo até selar"
ON public.future_letter_groups FOR UPDATE TO authenticated
USING (
  submitted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.future_letter_members m
    WHERE m.group_id = future_letter_groups.id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.future_letter_members m
    WHERE m.group_id = future_letter_groups.id AND m.user_id = auth.uid()
  )
);

-- POLICIES: members
CREATE POLICY "admin gerencia integrantes carta futuro"
ON public.future_letter_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "aluno adiciona integrantes em grupo aberto"
ON public.future_letter_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.future_letter_groups g
    WHERE g.id = future_letter_members.group_id
      AND g.created_by = auth.uid()
      AND g.submitted_at IS NULL
  )
);

CREATE POLICY "aluno vê integrantes do seu grupo até selar"
ON public.future_letter_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.future_letter_groups g
    WHERE g.id = future_letter_members.group_id
      AND g.submitted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.future_letter_members m2
        WHERE m2.group_id = g.id AND m2.user_id = auth.uid()
      )
  )
);

-- TRIGGERS
CREATE TRIGGER update_future_letter_sessions_updated_at
BEFORE UPDATE ON public.future_letter_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_future_letter_groups_updated_at
BEFORE UPDATE ON public.future_letter_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();