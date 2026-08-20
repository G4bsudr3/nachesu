WITH sums AS (
  SELECT m.id,
         SUM(COALESCE(p.duration_min_low, p.duration_min_high, 0)) AS low,
         SUM(COALESCE(p.duration_min_high, p.duration_min_low, 0)) AS high
  FROM public.modules m
  JOIN public.module_pills p ON p.module_id = m.id AND p.published
  GROUP BY m.id
)
UPDATE public.modules m
SET total_minutes = GREATEST(1, ROUND((s.low + s.high) / 2.0))
FROM sums s
WHERE s.id = m.id
  AND m.total_minutes <> GREATEST(1, ROUND((s.low + s.high) / 2.0));