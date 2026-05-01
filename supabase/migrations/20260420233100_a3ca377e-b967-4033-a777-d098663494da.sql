ALTER TABLE public.builder_cards
ADD COLUMN IF NOT EXISTS og_image_generated_at timestamptz;