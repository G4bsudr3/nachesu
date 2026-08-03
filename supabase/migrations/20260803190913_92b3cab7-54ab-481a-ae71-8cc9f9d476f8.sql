GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_ratings TO authenticated;
GRANT ALL ON public.module_ratings TO service_role;

CREATE INDEX IF NOT EXISTS idx_module_ratings_module_id ON public.module_ratings (module_id);
CREATE INDEX IF NOT EXISTS idx_module_ratings_created_at ON public.module_ratings (created_at DESC);