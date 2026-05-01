ALTER TABLE public.chora_bot_conversations
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS favorited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_chora_bot_conversations_user_favorite
ON public.chora_bot_conversations (user_id, is_favorite, updated_at DESC);