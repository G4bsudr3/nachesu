UPDATE public.module_pills
SET video_url = '/__l5e/assets-v1/103ebb93-1dfe-47e8-a944-4b300f054f21/modulo-13-abertura.mov',
    interaction_schema = (interaction_schema - 'video_placeholder')
      || jsonb_build_object('video_url','/__l5e/assets-v1/103ebb93-1dfe-47e8-a944-4b300f054f21/modulo-13-abertura.mov')
WHERE id = '0ac50d0c-d253-4fa8-8b7b-31801308b5ed';