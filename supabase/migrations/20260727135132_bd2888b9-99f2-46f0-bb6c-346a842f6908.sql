UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/8f6d8e47-df76-4412-945b-6ccf421f684c/modulo-12-abertura.mov',
    interaction_schema = (interaction_schema - 'video_placeholder')
      || jsonb_build_object('video_url','/__l5e/assets-v1/8f6d8e47-df76-4412-945b-6ccf421f684c/modulo-12-abertura.mov')
WHERE id = '10de0354-65be-47bb-add5-d2ad977481dc';