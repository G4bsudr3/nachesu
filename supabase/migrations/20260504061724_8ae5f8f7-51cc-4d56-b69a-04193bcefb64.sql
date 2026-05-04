ALTER TABLE public.hub_materials
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hub_materials_course ON public.hub_materials(course_id);