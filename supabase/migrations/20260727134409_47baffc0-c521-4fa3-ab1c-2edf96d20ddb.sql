UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/77872c8b-9f28-42f9-9dd5-a71f8b7e0b91/modulo-10-abertura.mov',
    interaction_schema = (interaction_schema - 'video_placeholder')
      || jsonb_build_object('video_url','/__l5e/assets-v1/77872c8b-9f28-42f9-9dd5-a71f8b7e0b91/modulo-10-abertura.mov')
WHERE id = 'f93ea815-3262-4741-9be6-455333e6349a';