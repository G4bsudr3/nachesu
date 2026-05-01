-- tabela tutorial_idea: guarda a ideia escolhida no início do tutorial
CREATE TABLE public.tutorial_idea (
  user_id uuid NOT NULL PRIMARY KEY,
  idea text NOT NULL,
  source text NOT NULL DEFAULT 'custom',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- valida source
CREATE OR REPLACE FUNCTION public.validate_tutorial_idea()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.source NOT IN ('fbi','custom') THEN
    RAISE EXCEPTION 'source inválido: %', NEW.source;
  END IF;
  IF length(trim(NEW.idea)) < 1 THEN
    RAISE EXCEPTION 'idea não pode ser vazia';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tutorial_idea_trigger
BEFORE INSERT OR UPDATE ON public.tutorial_idea
FOR EACH ROW EXECUTE FUNCTION public.validate_tutorial_idea();

CREATE TRIGGER update_tutorial_idea_updated_at
BEFORE UPDATE ON public.tutorial_idea
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tutorial_idea ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuário vê própria ideia tutorial"
ON public.tutorial_idea FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "usuário cria própria ideia tutorial"
ON public.tutorial_idea FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuário atualiza própria ideia tutorial"
ON public.tutorial_idea FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "usuário remove própria ideia tutorial"
ON public.tutorial_idea FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admin vê todas ideias tutorial"
ON public.tutorial_idea FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));