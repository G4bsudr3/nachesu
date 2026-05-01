-- 1. Novos campos em builder_cards
ALTER TABLE public.builder_cards
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS superpower_text text,
  ADD COLUMN IF NOT EXISTS shadow_text text,
  ADD COLUMN IF NOT EXISTS next_move_text text,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_builder_cards_share_token ON public.builder_cards(share_token) WHERE share_token IS NOT NULL;

-- 2. Função para gerar share_token base62 12 chars
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, 1 + floor(random() * 62)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. RLS: aluno autenticado vê própria carta SE publicada
CREATE POLICY "aluno vê própria carta publicada"
ON public.builder_cards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND is_published = true);

-- 4. Função pública para buscar carta por token (campos seguros apenas)
CREATE OR REPLACE FUNCTION public.get_public_card_by_token(_token text)
RETURNS TABLE(
  archetype public.builder_archetype,
  emoji text,
  tagline text,
  essence_phrase text,
  superpower_preview text,
  display_name text,
  nickname text,
  is_published boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bc.archetype,
    bc.emoji,
    bc.tagline,
    bc.essence_phrase,
    -- só primeiro parágrafo do superpower como teaser
    CASE
      WHEN bc.superpower_text IS NOT NULL
      THEN split_part(bc.superpower_text, E'\n\n', 1)
      ELSE NULL
    END AS superpower_preview,
    p.display_name,
    p.nickname,
    bc.is_published
  FROM public.builder_cards bc
  LEFT JOIN public.profiles p ON p.user_id = bc.user_id
  WHERE bc.share_token = _token
    AND bc.is_published = true
    AND bc.status = 'pronta'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_card_by_token(text) TO anon, authenticated;

-- 5. Função para marcar primeira visualização (idempotente)
CREATE OR REPLACE FUNCTION public.mark_card_first_view(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.builder_cards
  SET first_viewed_at = now()
  WHERE share_token = _token
    AND first_viewed_at IS NULL
    AND is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.mark_card_first_view(text) TO anon, authenticated;

-- 6. Bucket para OG images
INSERT INTO storage.buckets (id, name, public)
VALUES ('builder-card-og', 'builder-card-og', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "og images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'builder-card-og');

CREATE POLICY "service role manages og images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'builder-card-og')
WITH CHECK (bucket_id = 'builder-card-og');