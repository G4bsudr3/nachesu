ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;

CREATE OR REPLACE FUNCTION public.profiles_autofill_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(coalesce(NEW.nickname, split_part(coalesce(NEW.display_name,''),' ',1), 'builder'));
    -- remove acentos comuns ptbr
    base := translate(base,
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    );
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    IF base = '' OR base IS NULL THEN
      base := substr(NEW.user_id::text, 1, 8);
    END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND user_id <> NEW.user_id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_autofill_slug ON public.profiles;
CREATE TRIGGER trg_profiles_autofill_slug
BEFORE INSERT OR UPDATE OF nickname, display_name, slug ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_autofill_slug();

UPDATE public.profiles SET slug = NULL WHERE slug IS NULL;

CREATE TABLE public.hub_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.mission_submissions(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('🔥','💫','🤙','👀','🎉')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, submission_id, emoji)
);
CREATE INDEX idx_hub_reactions_submission ON public.hub_reactions(submission_id);
CREATE INDEX idx_hub_reactions_user ON public.hub_reactions(user_id);

ALTER TABLE public.hub_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth lê reações" ON public.hub_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "user reage em nome próprio" ON public.hub_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user remove sua reação" ON public.hub_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.hub_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.mission_submissions(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, submission_id)
);
CREATE INDEX idx_hub_comments_submission ON public.hub_comments(submission_id, created_at);

ALTER TABLE public.hub_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth lê comentários" ON public.hub_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "user comenta em nome próprio" ON public.hub_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user edita seu comentário" ON public.hub_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user apaga seu comentário" ON public.hub_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_hub_comments_updated_at
BEFORE UPDATE ON public.hub_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();