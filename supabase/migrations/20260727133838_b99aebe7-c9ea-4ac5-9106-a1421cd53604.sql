UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/fb5dd0db-7aa0-41e8-95c4-ee75d6ebd14e/modulo-07-abertura.mov',
    interaction_schema = (interaction_schema
      || jsonb_build_object('video_url', '/__l5e/assets-v1/fb5dd0db-7aa0-41e8-95c4-ee75d6ebd14e/modulo-07-abertura.mov'))
      - 'video_placeholder'
WHERE id = '61e0c6c0-3ccd-4e8a-b3b6-7d8bcfa4b322';