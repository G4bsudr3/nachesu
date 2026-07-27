UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/ed246b36-d004-47eb-9813-faa251183b02/modulo-06-abertura.mov',
    interaction_schema = (interaction_schema
      || jsonb_build_object('video_url', '/__l5e/assets-v1/ed246b36-d004-47eb-9813-faa251183b02/modulo-06-abertura.mov'))
      - 'video_placeholder'
WHERE id = '8a6c633f-476e-4b87-b54b-a9d5ee847b0c';