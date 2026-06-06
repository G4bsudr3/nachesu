ALTER TABLE public.module_deliverables
  ADD COLUMN IF NOT EXISTS score numeric(5,2);

ALTER TABLE public.rubrics
  ADD COLUMN IF NOT EXISTS score_max smallint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS score_type text NOT NULL DEFAULT 'none'
    CHECK (score_type IN ('none', 'numeric', 'letter'));