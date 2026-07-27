UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/19f7a319-a87b-4eb6-bb8a-381b4a1d9522/modulo-11-abertura.mov',
    interaction_schema = (interaction_schema - 'video_placeholder')
      || jsonb_build_object('video_url','/__l5e/assets-v1/19f7a319-a87b-4eb6-bb8a-381b4a1d9522/modulo-11-abertura.mov')
WHERE id = 'd23890c1-6624-4e8d-91ae-3682cab5a6fd';