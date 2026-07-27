UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/e342af72-d04c-4ce2-a284-e9f4948fbd72/modulo-09-abertura.mov',
    interaction_schema = (interaction_schema - 'video_placeholder')
      || jsonb_build_object('video_url','/__l5e/assets-v1/e342af72-d04c-4ce2-a284-e9f4948fbd72/modulo-09-abertura.mov')
WHERE id = '172b862b-915e-42c1-9f3c-3223d44b901e';