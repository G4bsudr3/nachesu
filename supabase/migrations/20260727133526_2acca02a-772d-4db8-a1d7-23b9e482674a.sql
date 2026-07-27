UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/f3fd0ddd-c10e-4918-afa8-1c3c3171e86b/modulo-05-abertura.mov',
    interaction_schema = (interaction_schema
      || jsonb_build_object('video_url', '/__l5e/assets-v1/f3fd0ddd-c10e-4918-afa8-1c3c3171e86b/modulo-05-abertura.mov'))
      - 'video_placeholder'
WHERE id = 'fb6c324c-0f7f-452f-b33a-ba5ffbe9abde';