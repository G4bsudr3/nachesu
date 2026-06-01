UPDATE public.courses
SET professor_name = 'Eduardo "Dudu" Obregon',
    theme = jsonb_set(theme, '{tutor_system_prompt}', to_jsonb(replace(theme->>'tutor_system_prompt', 'Dudu', 'Dudu Obregon')))
WHERE slug = 'economia-circular';