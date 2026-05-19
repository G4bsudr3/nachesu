ALTER TABLE public.module_deliverables REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.module_deliverables;