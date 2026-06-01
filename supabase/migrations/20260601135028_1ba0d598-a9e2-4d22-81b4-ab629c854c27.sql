-- adiciona tabelas ao publication realtime pro admin não precisar dar F5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'module_deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.module_deliverables;
  END IF;
END $$;

-- replica identity full pra payloads chegarem completos
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.module_deliverables REPLICA IDENTITY FULL;