UPDATE public.courses
SET theme = jsonb_set(
  theme,
  '{palette,accent}',
  to_jsonb('#8A85BF'::text)
)
WHERE slug = 'economia-circular';