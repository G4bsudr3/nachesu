UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/64c4976f-1f84-4a52-9a75-2a093fba16be/modulo-08-abertura.mov',
    interaction_schema = (interaction_schema
      || jsonb_build_object('video_url', '/__l5e/assets-v1/64c4976f-1f84-4a52-9a75-2a093fba16be/modulo-08-abertura.mov'))
      - 'video_placeholder'
WHERE id = '9c657001-a383-486b-8d6f-7cff8f8d6d16';