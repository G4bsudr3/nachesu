-- 1. coluna title (nullable; preenchida na primeira mensagem)
ALTER TABLE public.tutor_conversations
  ADD COLUMN IF NOT EXISTS title text;

-- 2. backfill: pega primeira mensagem do aluno (role=user) de cada conversa existente
UPDATE public.tutor_conversations tc
SET title = COALESCE(
  NULLIF(
    LEFT(
      regexp_replace(
        (
          SELECT (m->>'content')
          FROM jsonb_array_elements(tc.messages) AS m
          WHERE m->>'role' = 'user'
          LIMIT 1
        ),
        E'\\s+', ' ', 'g'
      ),
      80
    ),
    ''
  ),
  'conversa sem título'
)
WHERE tc.title IS NULL;