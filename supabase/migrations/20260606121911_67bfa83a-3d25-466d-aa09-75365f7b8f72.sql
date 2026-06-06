DELETE FROM public.module_deliverables
WHERE status = 'rascunho'
  AND submitted_at IS NULL
  AND reviewed_at IS NULL
  AND (content IS NULL OR content::text IN ('{}', 'null'))
  AND COALESCE(updated_at, created_at) < now() - interval '7 days';